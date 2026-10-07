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
import { filesToImages } from "../helpers/conversion.helper.js";
import { readFile } from "fs/promises";
import { Agent, fetch as undiciFetch } from "undici";
import { Ollama } from "ollama";
import { ServerErrorException } from "../exceptions/server-error.exception.js";
import type { CorrectCopyReturnType } from "../types/correct-copy-return.type.js";
import ExamCopyStatRepository from "../repositories/exam-copy-analysis.repository.js";
import { loadFile } from "../helpers/files.helper.js";
import type { ExamSubjectAnalysisAttributes } from "../types/interfaces.js";

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

  public async findById(subjectId: number) {
    const retour = await ExamSubjectRepository.findById(subjectId);
    if (retour == null)
      throw new EntityNotFoundException(
        "L'entité ExamSubject n'a pas été trouvé",
      );
    return retour;
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
      JSON.stringify(subject),
    );

    //5. Envoie de la requête multimodale à Ollama
    const response = await this.ollama.chat({
      model: this.MODEL,
      messages: [{ role: "user", content: promptText, images: b64File }],
      format: "json", // équivalent de responseMimeType: 'application/json',
      options: {
        num_ctx: 8192,
        num_batch: 512,
        num_thread: 6,
        temperature: 0.2,
      },
    });

    // 6. Analyse de la réponse
    const responseText = response.message.content;
    if (!responseText) {
      throw new ServerErrorException(
        "Ollama n'a pas retourné de contenu valide.",
      );
    }

    const jsonData: CorrectCopyReturnType = JSON.parse(responseText);

    // 7. Enregistrement dans la base de données
    const copyStat: ExamCopyAnalysisAttributes = {
      examCopyId: copy.id || 0,
      studentName: jsonData.student_name,
      totalScore: jsonData.sections.reduce(
        (noteTotal, currentSection) =>
          noteTotal +
          currentSection.questions.reduce(
            (note, currentQuestion) => note + currentQuestion.score,
            0,
          ),
        0,
      ),
      maxScore: jsonData.note_sur,
      sectionResults: jsonData.sections.map((section) => {
        const currentSection = subject.dataValues.analysis?.sections?.find(
          (item) => item.theme == section.theme,
        );
        return {
          examSubjectSectionId: currentSection?.id || 0,
          questionResults: section.questions.map((question) => {
            const currentQuestion = currentSection?.questions?.find(
              (item) => item.questionNumber == question.question_number,
            );
            return {
              examQuestionId: currentQuestion?.id || 0,
              score: question.score,
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
