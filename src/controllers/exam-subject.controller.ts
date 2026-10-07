import type { Request, Response } from "express";
import ExamSubjectRepository from "../repositories/exam-subject.repository.js";
import ExamSubjectService from "../services/exam-subject.service.js";
import { UserInputException } from "../exceptions/user-input.exception.js";
import { ServerErrorException } from "../exceptions/server-error.exception.js";
import { EntityNotFoundException } from "../exceptions/entity-not-found.exception.js";
import readSubjectService from "../services/read-subject.service.js";

import path from "path";
import { saveFilesToLocal } from "../helpers/conversion.helper.js";
import type { ExamCopyAttributes } from "../types/exam-copy.types.js";
import ExamCopyRepository from "../repositories/exam-copy.repository.js";

export default class ExamSubjectController {
  public static async create(req: Request, res: Response) {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res
          .status(400)
          .json({ error: "Aucun fichier n'a été fourni dans le champ 'files'." });
      }

      const { disciplineId, description } = req.body;

      return res.status(201).json(
        await ExamSubjectService.create(
          files,
          disciplineId !== undefined ? parseInt(disciplineId) : undefined,
          description,
        ),
      );
    } catch (err) {
      console.error(err);
      if (err instanceof UserInputException) {
        res.status(400).json({ error: err.message });
      } else if (err instanceof ServerErrorException) {
        res.status(500).json({ error: "Erreur interne du serveur" });
      } else {
        res.status(500).json({ message: "Une erreur s'est produite" });
      }
    }
  }

  public static async getById(req: Request, res: Response) {
    try {
      const idStr = req.params.id;
      if (typeof idStr != "string") throw "invalid format of id";
      const id = parseInt(idStr);

      return res.json(await ExamSubjectService.findById(id));
    } catch (error) {
      console.error(error);
      if (error instanceof EntityNotFoundException) {
        res
          .status(404)
          .json({ error: "La ressource demandée n'a pas été trouvée" });
      } else {
        res.status(500).json({
          error:
            "Une erreur est survenue lors de la récupération du sujet d'examen.",
        });
      }
    }
  }

  public static async importAnalysis(req: Request, res: Response) {
    try {
      const idStr = req.params.id;
      if (typeof idStr != "string") throw "invalid format of id";
      const id = parseInt(idStr);

      const file = req.file as Express.Multer.File | undefined;
      if (!file) {
        return res
          .status(400)
          .json({ error: "Aucun fichier n'a été fourni dans le champ 'file'." });
      }

      return res.json(
        await ExamSubjectService.importAnalysis(id, file.buffer),
      );
    } catch (err) {
      console.error(err);
      if (err instanceof UserInputException) {
        res.status(400).json({ error: err.message });
      } else if (err instanceof EntityNotFoundException) {
        res
          .status(404)
          .json({ error: "La ressource demandée est introuvable" });
      } else if (err instanceof ServerErrorException) {
        res.status(500).json({ error: "Erreur interne du serveur" });
      } else {
        res.status(500).json({ message: "Une erreur s'est produite" });
      }
    }
  }

  public static async addCopies(req: Request, res: Response) {
    try {
      // Vérification de la présence de fichiers
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0)
        return res.status(400).json({ error: "Aucun fichier n'a été fourni" });

      // Récupération des autres champs
      const { examSubjectId } = req.body;
      if (!examSubjectId)
        return res.status(400).json({ error: "examSubjectId is required" });

      // Upload des fichiers
      const uploadsDir = path.join(process.cwd(), "uploads", "exam-copies");
      const fileNames = saveFilesToLocal(files, uploadsDir);

      // Création des copies dans la base de données
      const entities: ExamCopyAttributes[] = fileNames.map((filename) => {
        return {
          filename,
          examSubjectId,
        };
      });

      for (const entity of entities) {
        await ExamCopyRepository.save(entity);
      }
      return res.json({ message: "Tout s'est bien passé" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Une erreur s'est produite" });
    }
  }

  public static async getAll(req: Request, res: Response) {
    try {
      const examSubjects = await ExamSubjectRepository.findAll();
      res.json(examSubjects);
    } catch (error) {
      console.error(error);
      res.status(500).json({
        error:
          "Une erreur est survenue lors de la récupération des sujets d'examen.",
      });
    }
  }

  public static async extractCsv(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (typeof id != "string") throw "invalid format of id";

      const subject = await ExamSubjectRepository.findById(parseInt(id));
      if (!subject) {
        return res.status(404).json({ error: "Sujet d'examen non trouvé." });
      }

      const csv = await ExamSubjectService.extractCsv(parseInt(id));
      res.send(csv);
    } catch (error) {
      console.error(error);
      if (error instanceof EntityNotFoundException) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({
        error: "Une erreur est survenue lors de l'extraction du csv'",
      });
    }
  }

  public static async revalidateAnalysis(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (typeof id != "string") throw "invalid format of id";

      const retour = await readSubjectService.extractSubjectAnlysis(
        parseInt(id),
      );
      res.json(retour);
    } catch (error) {
      console.error(error);
      if (error instanceof EntityNotFoundException) {
        res
          .status(404)
          .json({ error: `La ressource subject demandée est introuvabe` });
      } else {
        res.status(500).json({ error: "Une erreur s'est produite" });
      }
    }
  }

  public static async createExamCopy(req: Request, res: Response) {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res
        .status(400)
        .json({ error: "Aucun fichier n'a été fourni dans le champ 'files'." });
    }

    const idStr = req.params.id;
    if (typeof idStr != "string") throw "invalid format of id";
    const id = parseInt(idStr);

    try {
      return res
        .status(201)
        .json(await ExamSubjectService.createExamCopy(id, files));
    } catch (err) {
      console.error(err);
      if (err instanceof UserInputException) {
        res.status(400).json({ error: err.message });
      } else if (err instanceof ServerErrorException) {
        res.status(500).json({ error: "Erreur interne du serveur" });
      } else if (err instanceof EntityNotFoundException) {
        res
          .status(404)
          .json({ error: "La ressource demandée est introuvable" });
      } else {
        res.status(500).json({ messsage: "Une erreur s'est produite" });
      }
    }
  }

  public static async getAllCopies(req: Request, res: Response) {
    try {
      const idStr = req.params.id;
      if (typeof idStr != "string") throw "invalid format of id";
      const id = parseInt(idStr);

      return res.json(await ExamSubjectService.findAllCopies(id));
    } catch (error) {
      console.error(error);
      if (error instanceof EntityNotFoundException) {
        res
          .status(404)
          .json({ error: "La ressource demandée est introuvable" });
      } else {
        res.status(500).json({ message: "Une erreur s'est produite" });
      }
    }
  }

  public static async getCopyById(req: Request, res: Response) {
    try {
      const idStr = req.params.id;
      if (typeof idStr != "string") throw "invalid format of id";
      const id = parseInt(idStr);

      const examCopyIdStr = req.params.examCopyId;
      if (typeof examCopyIdStr != "string")
        throw "invalid format of examCopyId";
      const examCopyId = parseInt(examCopyIdStr);

      return res.json(await ExamSubjectService.findOneCopy(id, examCopyId));
    } catch (error) {
      console.error(error);
      if (error instanceof EntityNotFoundException) {
        res
          .status(404)
          .json({ error: "La ressource demandée est introuvable" });
      } else {
        res.status(500).json({ message: "Une erreur s'est produite" });
      }
    }
  }

  public static async correctCopy(req: Request, res: Response) {
    try {
      const idStr = req.params.id;
      if (typeof idStr != "string") throw "invalid format of id";
      const id = parseInt(idStr);

      const examCopyIdStr = req.params.examCopyId;
      if (typeof examCopyIdStr != "string")
        throw "invalid format of examCopyId";
      const examCopyId = parseInt(examCopyIdStr);

      return res.json(await ExamSubjectService.correctCopy(id, examCopyId));
    } catch (err) {
      console.error(err);
      if (err instanceof UserInputException) {
        res.status(400).json({ error: err.message });
      } else if (err instanceof ServerErrorException) {
        res.status(500).json({ error: "Erreur interne du serveur" });
      } else {
        res.status(500).json({ messsage: "Une erreur s'est produite" });
      }
    }
  }
}
