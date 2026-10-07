import { Router } from "express";
import ExamSubjectNonRestController from "../nonRestControllers/exam-subject-non-rest.controller.js";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/create-subject",
  (req, res, next) => {
    upload.array("files")(req, res, (err) => {
      if (err)
        return res.status(400).json({ error: `Erreur multer: ${err.message}` });
      next();
    });
  },
  ExamSubjectNonRestController.createSubject,
);

export default router;
