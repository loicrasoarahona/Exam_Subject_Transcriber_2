import { Router } from "express";
import ReadSubjectController from "../controllers/read-subject.controller.js";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/read-subject",
  (req, res, next) => {
    upload.array("files")(req, res, (err) => {
      if (err)
        return res.status(400).json({ error: `Erreur multer: ${err.message}` });
      next();
    });
  },
  ReadSubjectController.readSubject,
);

router.post(
  "/view-extract-subject",
  (req, res, next) => {
    upload.array("files")(req, res, (err) => {
      if (err)
        return res.status(400).json({ error: `Erreur multer: ${err.message}` });
      next();
    });
  },
  ReadSubjectController.extractSubject,
);

export default router;
