/* eslint-disable @typescript-eslint/no-explicit-any */
import path from "path";
import { EntityNotFoundException } from "../exceptions/entity-not-found.exception.js";
import { UserInputException } from "../exceptions/user-input.exception.js";
import { isValidDocumentExtension } from "../helpers/file-validation.helper.js";
import ExamSubjectRepository from "../repositories/exam-subject.repository.js";
import fs, { existsSync } from "fs";
import type {
  ExamCopyAnalysisAttributes,
  ExamCopyAttributes,
} from "../types/exam-copy.types.js";
import ExamCopyRepository from "../repositories/exam-copy.repository.js";
import {
  filesToImages,
  saveFilesToLocal,
} from "../helpers/conversion.helper.js";
import { readFile } from "fs/promises";
import { Agent, fetch as undiciFetch } from "undici";
import { Ollama } from "ollama";
import { ServerErrorException } from "../exceptions/server-error.exception.js";
import type { CorrectCopyReturnType } from "../types/correct-copy-return.type.js";
import ExamCopyStatRepository from "../repositories/exam-copy-analysis.repository.js";
import { loadFile } from "../helpers/files.helper.js";
import type {
  ExamSubjectAnalysisAttributes,
  ExamSubjectAttributes,
} from "../types/interfaces.js";
import ExamSubjectAnalysisRepository from "../repositories/exam-subject-analysis.repository.js";
import type { SubjectExtraction } from "../types/read-subject.types.js";

class ExamSubjectService {
  private longTimeoutDispatcher = new Agent({
    headersTimeout: 0,
    bodyTimeout: 0,
  });

  private ollama = new Ollama({
    fetch: ((url: any, options: any) =>
      undiciFetch(url, {
        ...options,
        dispatcher: this.longTimeoutDispatcher,
      })) as unknown as typeof fetch,
  }); // pointe vers http://localhost:11434 par défaut

  private MODEL = "gemma3:12b";

  public async extractCsv(id: number): Promise<string> {
    const subject = await ExamSubjectRepository.findById(id);
    if (!subject) throw new EntityNotFoundException("ExamSubject not found");

    const analysis: ExamSubjectAnalysisAttributes | undefined =
      subject.dataValues.analysis;
    if (!analysis) throw "subject.analysis is null";

    if (!analysis.sections) throw "analysis.section is null";

    const headers = analysis.sections?.map((el) => el.theme).join(";") + "\n";

    const copies = await ExamSubjectRepository.findAllCopiesComplete(id);
    const body = copies
      .filter((copy) => copy.dataValues.analysis)
      .map(
        (copy) =>
          analysis.sections
            ?.map((section) =>
              copy.dataValues.analysis?.sectionResults
                ?.find(
                  (sectionResult) =>
                    sectionResult.examSubjectSectionId == section.id,
                )
                ?.questionResults?.reduce(
                  (acc, current) => acc + (current.score || 0),
                  0,
                ),
            )
            .join(";") +
          ";" +
          copy.dataValues.analysis?.studentName,
      )
      .join("\n");

    return headers + body;
  }

  public async create(
    files: Express.Multer.File[],
    disciplineId?: number,
    description?: string,
  ): Promise<ExamSubjectAttributes> {
    // Validation rapide du type de fichier accepté
    if (!isValidDocumentExtension(files)) {
      throw new UserInputException(
        "Format de fichier non supporté. Fournissez des JPEG, PNG ou PDF",
      );
    }

    // Sauvegarde du fichier
    const uploadsDir = path.join(process.cwd(), "uploads", "exam-subjects");
    const filename = saveFilesToLocal(files, uploadsDir)[0];
    if (!filename)
      throw new ServerErrorException(
        "Une erreur s'est produite lors de l'enregistrement du fichier",
      );

    // Enregistrement dans la base de données
    const entity: ExamSubjectAttributes = {
      filename,
      disciplineId,
      description,
    };

    return (await ExamSubjectRepository.save(entity)).dataValues;
  }

  public async findById(subjectId: number) {
    const retour = await ExamSubjectRepository.findById(subjectId);
    if (retour == null)
      throw new EntityNotFoundException(
        "L'entité ExamSubject n'a pas été trouvé",
      );
    return retour;
  }

  public async importAnalysis(
    subjectId: number,
    fileBuffer: Buffer,
  ): Promise<ExamSubjectAnalysisAttributes> {
    // 1. Vérification de l'existence du subject
    await this.findById(subjectId);

    // 2. Lecture et parsing du JSON fourni
    let extraction: SubjectExtraction;
    try {
      extraction = JSON.parse(fileBuffer.toString("utf-8"));
    } catch {
      throw new UserInputException(
        "Le fichier fourni n'est pas un JSON valide.",
      );
    }

    if (!Array.isArray(extraction?.sections)) {
      throw new UserInputException(
        "Le JSON fourni ne respecte pas le format attendu (champ 'sections' manquant).",
      );
    }

    // 3. Construction de l'entité à partir du JSON
    const entity: ExamSubjectAnalysisAttributes = {
      subjectId,
      discipline: extraction.discipline,
      warnings: extraction.warnings,
      sections: extraction.sections.map((section) => ({
        order: section.order,
        sectionCode: section.sectionCode,
        theme: section.theme,
        declaredPoints: section.declaredPoints,
        context: section.context,
        questions: section.questions.map((question) => ({
          questionNumber: question.questionNumber,
          printedNumber: question.printedNumber,
          statement: question.statement,
          questionType: question.questionType,
          points: question.points,
          context: question.context,
          figure: question.figure,
          expectedAnswer: question.expectedAnswer,
          partialCredit: question.partialCredit,
          needsReview: question.needsReview,
          options: question.options,
        })),
      })),
    };

    // 4. Remplacement de l'analyse existante par la nouvelle
    await ExamSubjectRepository.deleteAnalysis(subjectId);
    const saved = await ExamSubjectAnalysisRepository.save(entity);
    if (!saved)
      throw new ServerErrorException("L'enregistrement de l'analyse a échoué.");

    return saved.dataValues;
  }

  public async createExamCopy(
    subjectId: number,
    files: Express.Multer.File[],
  ): Promise<ExamCopyAttributes> {
    // Validation rapide du type de fichier accepté
    if (!isValidDocumentExtension(files)) {
      throw new UserInputException(
        "Format de fichier non supporté. Fournissez des JPEG, PNG ou PDF",
      );
    }

    // 2. Chargement du subject
    const examSubject = await this.findById(subjectId);
    if (examSubject.dataValues.id == undefined)
      throw "undefined examSubject.id";

    // 3. Sauvegarder le fichiers
    const uploadsDir = path.join(process.cwd(), "uploads", "exam-copies");
    fs.mkdirSync(uploadsDir, { recursive: true });
    const timestamp = Date.now();
    let examCopyFileName = "";
    const savedFilenames: string[] = [];
    for (const [i, file] of files.entries()) {
      const uniqueName = `${timestamp}_${i}_${file.originalname}`;
      fs.writeFileSync(path.join(uploadsDir, uniqueName), file.buffer);
      savedFilenames.push(uniqueName);
      examCopyFileName = uniqueName;
    }

    // 4. Enregistrement dans la base de données
    const entity: ExamCopyAttributes = {
      filename: examCopyFileName,
      examSubjectId: examSubject.dataValues.id,
    };

    return (await ExamCopyRepository.save(entity)).dataValues;
  }

  public async findAllCopies(subjectId: number): Promise<ExamCopyAttributes[]> {
    const subject = await this.findById(subjectId);
    if (subject.dataValues.id == undefined) throw "undefined subject.id";

    return (
      await ExamSubjectRepository.findAllCopies(subject.dataValues.id)
    ).map((item) => item.dataValues);
  }

  public async findOneCopy(
    subjectId: number,
    examCopyId: number,
  ): Promise<ExamCopyAttributes> {
    await this.findById(subjectId);

    const retour = await ExamCopyRepository.findById(examCopyId);

    if (retour == null) throw new EntityNotFoundException("");

    return retour.dataValues;
  }

  // Exclut les métadonnées Sequelize et les champs d'extraction inutiles à la correction,
  // pour ne pas saturer num_ctx avec le JSON du sujet.
  private buildCorrectionSubjectPayload(
    analysis: ExamSubjectAnalysisAttributes | undefined,
  ) {
    return {
      sections: (analysis?.sections ?? []).map((section) => ({
        sectionCode: section.sectionCode,
        theme: section.theme,
        ...(section.context ? { context: section.context } : {}),
        questions: (section.questions ?? []).map((question) => ({
          questionNumber: question.questionNumber,
          printedNumber: question.printedNumber,
          statement: question.statement,
          questionType: question.questionType,
          points: question.points,
          ...(question.context ? { context: question.context } : {}),
          ...(question.figure ? { figure: question.figure } : {}),
          ...(question.options ? { options: question.options } : {}),
          expectedAnswer: question.expectedAnswer,
          partialCredit: question.partialCredit,
        })),
      })),
    };
  }

  public async correctCopy(
    id: number,
    examCopyId: number,
  ): Promise<ExamCopyAttributes> {
    // 1. Vérification de l'existence du subject
    const subject = await this.findById(id);

    // 2. Chargement du copy
    const copy: ExamCopyAttributes = await this.findOneCopy(id, examCopyId);
    const filename = copy.filename;
    if (!filename) throw "undefined copy.filename";

    // 3. Chargement de la feuille d'examen et conversion en base 64
    const filepath = path.join("uploads", "exam-copies", filename);
    const inputFile = await loadFile(filepath);
    const b64File = await filesToImages([inputFile]);

    // 4. Récupération du prompt dans les fichiers
    const promptPath = path.join(
      "src",
      "prompts",
      "Prompt_correction_copie.txt",
    );
    if (!existsSync(promptPath)) throw "prompt file not found";
    let promptText = await readFile(promptPath, "utf-8");
    promptText = promptText.replace(
      "[replace_with_question_json]",
      JSON.stringify(
        this.buildCorrectionSubjectPayload(subject.dataValues.analysis),
      ),
    );

    //5. Envoie de la requête multimodale à Ollama
    const response = await this.ollama.chat({
      model: this.MODEL,
      messages: [{ role: "user", content: promptText, images: b64File }],
      format: "json", // équivalent de responseMimeType: 'application/json',
      options: {
        num_ctx: 12288,
        num_batch: 512,
        num_thread: 6,
        temperature: 0,
        seed: 42,
        num_predict: 2048, // coupe une sortie qui boucle
      },
      keep_alive: "10m",
    });

    // 6. Analyse de la réponse
    const responseText = response.message.content;
    if (!responseText) {
      throw new ServerErrorException(
        "Ollama n'a pas retourné de contenu valide.",
      );
    }

    let jsonData: CorrectCopyReturnType;
    try {
      jsonData = JSON.parse(responseText);
    } catch {
      throw new ServerErrorException(
        "La réponse d'Ollama n'est pas un JSON valide (probablement tronquée, essayez d'augmenter num_ctx).",
      );
    }

    // 7. Enregistrement dans la base de données
    const subjectSections = subject.dataValues.analysis?.sections ?? [];
    const maxScore = subjectSections.reduce(
      (sectionAcc, section) =>
        sectionAcc +
        (section.questions ?? []).reduce(
          (questionAcc, question) => questionAcc + (question.points || 0),
          0,
        ),
      0,
    );

    const copyStat: ExamCopyAnalysisAttributes = {
      examCopyId: copy.id || 0,
      studentName: jsonData.studentName,
      totalScore: jsonData.sections.reduce(
        (noteTotal, currentSection) =>
          noteTotal +
          currentSection.questions.reduce(
            (note, currentQuestion) => note + currentQuestion.score,
            0,
          ),
        0,
      ),
      maxScore,
      sectionResults: jsonData.sections.map((section) => {
        const currentSection = subjectSections.find(
          (item) => item.sectionCode == section.sectionCode,
        );
        return {
          examSubjectSectionId: currentSection?.id || 0,
          questionResults: section.questions.map((question) => {
            const currentQuestion = currentSection?.questions?.find(
              (item) => item.questionNumber == question.questionNumber,
            );
            return {
              examQuestionId: currentQuestion?.id || 0,
              score: question.score,
              needsReview: question.needsReview,
              comment: question.comment,
            };
          }),
        };
      }),
    };
    ExamCopyRepository.deleteAnalysis(examCopyId);
    const newStat = await ExamCopyStatRepository.save(copyStat);

    copy.analysis = newStat.dataValues;
    return copy;
  }
}

export default new ExamSubjectService();
