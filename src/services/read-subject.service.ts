/* eslint-disable @typescript-eslint/no-explicit-any */
import { Agent, fetch as undiciFetch } from "undici";
import { Ollama } from "ollama";
import { UserInputException } from "../exceptions/user-input.exception.js";
import type {
  ExamSubjectAnalysisAttributes,
  ExamSubjectAttributes,
} from "../types/interfaces.js";
import ExamSubjectRepository from "../repositories/exam-subject.repository.js";
import {
  filesToImages,
  saveFilesToLocal,
  type InputFile,
} from "../helpers/conversion.helper.js";
import path from "path";
import { readFile } from "fs/promises";
import { ServerErrorException } from "../exceptions/server-error.exception.js";
import type {
  SubjectAnalysis,
  SubjectExtraction,
} from "../types/read-subject.types.js";
import { isValidDocumentExtension } from "../helpers/file-validation.helper.js";
import { EntityNotFoundException } from "../exceptions/entity-not-found.exception.js";
import { loadFile } from "../helpers/files.helper.js";
import ExamSubjectAnalysisRepository from "../repositories/exam-subject-analysis.repository.js";

class ReadSubjectService {
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

  public async uploadReadSubject(
    files: Express.Multer.File[],
  ): Promise<ExamSubjectAttributes> {
    // Validation rapide du type de fichier accepté
    if (!isValidDocumentExtension(files)) {
      throw new UserInputException(
        `Format de fichier non supporté". Fournissez des JPEG, PNG ou PDF.`,
      );
    }

    // extraction de l'analyse
    const jsonData: SubjectAnalysis = await this.extractAnlysisFromFile(files);

    // 7. Sauvegarder le fichiers
    const subjectFileNames = saveFilesToLocal(
      files,
      path.join(process.cwd(), "uploads", "exam-subjects"),
    );
    const subjectFileName = subjectFileNames[0];
    if (!subjectFileName)
      throw "Une erreur s'est produite lors de l'enregistrement du fichier";

    // 6. Enregistrement dans la base de données
    const entity: ExamSubjectAttributes = {
      filename: subjectFileName,
      analysis: {
        description: jsonData.subject,
        sections: jsonData.sections.map((section) => {
          return {
            theme: section.theme,
            questions: section.questions.map((question) => {
              return {
                questionNumber: question.question_number,
                statement: question.statement,
                questionType: question.question_type,
                expectedAnswer: question.excepted_answer,
                points: question.points,
              };
            }),
          };
        }),
      },
    };

    const retour = await ExamSubjectRepository.save(entity);
    return retour.dataValues;
  }

  public async extractSubjectAnlysis(id: number) {
    // récupération du sujet
    const subject = await ExamSubjectRepository.findById(id);
    if (subject == null) {
      throw new EntityNotFoundException(`ExamSubject ${id} not found`);
    }
    if (!subject.dataValues.filename) {
      throw "subject.filename is undefined";
    }

    // récupération du fichier
    const filePath = path.join(
      "uploads",
      "exam-subjects",
      subject.dataValues.filename,
    );
    const inputFile = await loadFile(filePath);

    // extraction de l'analyse
    const analysis: SubjectAnalysis =
      await this.extractAnlysisFromFile(inputFile);

    // enregistrement dans la base de données
    const entity: ExamSubjectAnalysisAttributes = {
      subjectId: id,
      description: analysis.subject,
      sections: analysis.sections.map((section) => {
        return {
          theme: section.theme,
          questions: section.questions.map((question) => {
            return {
              questionNumber: question.question_number,
              statement: question.statement,
              questionType: question.question_type,
              expectedAnswer: question.excepted_answer,
              points: question.points,
            };
          }),
        };
      }),
    };

    await ExamSubjectRepository.deleteAnalysis(id);
    return (await ExamSubjectAnalysisRepository.save(entity)).dataValues;
  }

  public async extractSubject(
    files: Express.Multer.File[],
  ): Promise<SubjectExtraction> {
    // Validation rapide du type de fichier accepté
    if (!isValidDocumentExtension(files)) {
      throw new UserInputException(
        `Format de fichier non supporté". Fournissez des JPEG, PNG ou PDF.`,
      );
    }

    // conversion en base64
    const images = await filesToImages(files);

    // récupération du prompt
    const filePath = path.join("src", "prompts", "Prompt_extraction.txt");
    const promptText = await readFile(filePath, "utf-8");

    // envoie de la requête multimodale à Ollama
    const response = await this.ollama.chat({
      model: this.MODEL,
      messages: [{ role: "user", content: promptText, images }],
      format: "json", // équivalent de responseMimeType: 'application/json',
      options: {
        num_ctx: 8192,
        num_batch: 512,
        num_thread: 6,
        temperature: 0.2,
      },
    });

    // analyse de la réponse
    const responseText = response.message.content;
    if (!responseText) {
      throw new ServerErrorException(
        "Ollama n'a pas retourné de contenu valide.",
      );
    }

    return JSON.parse(responseText) as SubjectExtraction;
  }

  private async extractAnlysisFromFile(
    file: InputFile | InputFile[],
  ): Promise<SubjectAnalysis> {
    // conversion en base64
    let images = null;
    if (Array.isArray(file)) {
      images = await filesToImages(file);
    } else {
      images = await filesToImages([file]);
    }

    // récupération du prompt
    const filePath = path.join("src", "prompts", "Prompt_analyse_sujet.txt");
    const promptText = await readFile(filePath, "utf-8");

    // envoie de la requête multimodale à Ollama
    const response = await this.ollama.chat({
      model: this.MODEL,
      messages: [{ role: "user", content: promptText, images }],
      format: "json", // équivalent de responseMimeType: 'application/json',
      options: {
        num_ctx: 8192,
        num_batch: 512,
        num_thread: 6,
        temperature: 0.2,
      },
    });

    // 5. Analyse de la réponse
    const responseText = response.message.content;
    if (!responseText) {
      throw new ServerErrorException(
        "Ollama n'a pas retourné de contenu valide.",
      );
    }

    const jsonData: SubjectAnalysis = JSON.parse(responseText);
    return jsonData;
  }
}

export default new ReadSubjectService();
