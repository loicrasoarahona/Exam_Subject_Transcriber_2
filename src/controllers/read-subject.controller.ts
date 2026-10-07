/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Request, Response } from "express";

import ReadSubjectService from "../services/read-subject.service.js";
import { UserInputException } from "../exceptions/user-input.exception.js";
import { ServerErrorException } from "../exceptions/server-error.exception.js";

export default class ReadSubjectController {
  public static async readSubject(req: Request, res: Response) {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res
        .status(400)
        .json({ error: "Aucun fichier n'a été fourni dans le champ 'files'." });
    }

    try {
      return res.json(await ReadSubjectService.uploadReadSubject(files));
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

  public static async extractSubject(req: Request, res: Response) {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res
        .status(400)
        .json({ error: "Aucun fichier n'a été fourni dans le champ 'files'." });
    }

    try {
      return res.json(await ReadSubjectService.extractSubject(files));
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
