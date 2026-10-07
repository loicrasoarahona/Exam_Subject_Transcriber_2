import { Router } from "express";
import multer from "multer";
import TestOllamaController from "../controllers/test-ollama.controller.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/extract-score",
  (req, res, next) => {
    upload.array("files")(req, res, (err) => {
      if (err)
        return res.status(400).json({ error: `Erreur multer: ${err.message}` });
      next();
    });
  },
  TestOllamaController.extractScore,
);

router.post(
  "/transcribe",
  (req, res, next) => {
    upload.array("files")(req, res, (err) => {
      if (err)
        return res.status(400).json({ error: `Erreur multer: ${err.message}` });
      next();
    });
  },
  TestOllamaController.transcribe,
);

export default router;
