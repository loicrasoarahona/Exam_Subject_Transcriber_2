import express from "express";
import ExamSubjectController from "../controllers/exam-subject.controller.js";
import multer from "multer";
import LockMiddlewareController from "../controllers/lock-middleware.controller.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", ExamSubjectController.getAll);

router.post(
  "/",
  (req, res, next) => {
    upload.array("files")(req, res, (err) => {
      if (err)
        return res.status(400).json({ error: `Erreur multer: ${err.message}` });
      next();
    });
  },
  ExamSubjectController.create,
);

router.get("/:id", ExamSubjectController.getById);

router.get("/:id/to_csv", ExamSubjectController.extractCsv);

router.post(
  "/:id/exam-copies",
  (req, res, next) => {
    upload.array("files")(req, res, (err) => {
      if (err)
        return res.status(400).json({ error: `Erreur multer: ${err.message}` });
      next();
    });
  },
  ExamSubjectController.createExamCopy,
);

router.get(
  "/:id/revalidate-analysis",
  ExamSubjectController.revalidateAnalysis,
);

router.post(
  "/:id/import-analysis",
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err)
        return res.status(400).json({ error: `Erreur multer: ${err.message}` });
      next();
    });
  },
  ExamSubjectController.importAnalysis,
);

router.get("/:id/exam-copies", ExamSubjectController.getAllCopies);

router.get("/:id/exam-copies/:examCopyId", ExamSubjectController.getCopyById);

router.post(
  "/:id/exam-copies/:examCopyId/correct-copy",
  LockMiddlewareController.lockOllamaFunctionsMiddleware, // installer un vérou de route
  ExamSubjectController.correctCopy,
);

router.post(
  "/:id/add-copies",
  LockMiddlewareController.lockOllamaFunctionsMiddleware, // installer un vérou de route
  (req, res, next) => {
    upload.array("files")(req, res, (err) => {
      if (err)
        return res.status(400).json({ error: `Erreur multer: ${err.message}` });
      next();
    });
  },
  ExamSubjectController.addCopies,
);

export default router;
