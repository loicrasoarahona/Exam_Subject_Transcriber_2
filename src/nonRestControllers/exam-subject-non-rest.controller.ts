import type { Request, Response } from "express";
import path from "path";
import { saveFilesToLocal } from "../helpers/conversion.helper.js";
import type { ExamSubjectAttributes } from "../types/interfaces.js";
import ExamSubjectRepository from "../repositories/exam-subject.repository.js";

export default class ExamSubjectNonRestController {
  public static async createSubject(req: Request, res: Response) {
    try {
      // 1. Vérification de la présence du fichier
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({
          error: "Aucun fichier n'a été fourni dans le champ 'files'.",
        });
      }

      // 2. Upload du fichier
      const uploadsDir = path.join(process.cwd(), "uploads", "exam-subjects");
      const filename = saveFilesToLocal(files, uploadsDir)[0];

      if (!filename) throw "L'upload ne s'est pas passé correctement";

      // 3. Récupération des autres champs et enregistrement dans la base de données
      const { disciplineId, description } = req.body;
      const entity: ExamSubjectAttributes = {
        filename,
        disciplineId,
        description,
      };
      const retour = await ExamSubjectRepository.save(entity);

      return res.json(retour);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Une erreur s'est produite" });
    }
  }
}
