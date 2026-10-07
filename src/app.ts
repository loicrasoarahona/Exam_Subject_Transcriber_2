import "dotenv/config";
import express from "express";
import cors from "cors";
import subjectTranscriberRouter from "./nonRestRoutes/subject-transcriber.route.js";
import examSubjectRouter from "./routes/exam-subject.route.js";
import testOllamaRouter from "./nonRestRoutes/test-ollama.route.js";
import disciplineRouter from "./routes/discipline.route.js";
import testRouter from "./nonRestRoutes/test.route.js";
import examSubjectNonRestRouter from "./nonRestRoutes/exam-subject-non-rest.route.js";
import { setupModelRelations } from "./models/setup.js";
import { createDisciplineDefaultData, initDB } from "./config/init.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  try {
    const app = express();
    app.use(cors());
    const PORT = 3000;

    setupModelRelations(); // Assure que les relations entre les modèles sont configurées avant de démarrer le serveur
    await initDB();
    await createDisciplineDefaultData(); // Créer les données de discipline par défaut

    app.use(express.json());
    app.use("/subject-transcriber", subjectTranscriberRouter);
    app.use("/exam-subjects", examSubjectRouter);
    app.use("/test-ollama", testOllamaRouter);
    app.use("/test", testRouter);
    app.use("/disciplines", disciplineRouter);
    app.use("/normal-api/exam-subjects", examSubjectNonRestRouter);
    app.use(
      "/ressources/subjects",
      express.static(path.join(__dirname, "..", "uploads", "exam-subjects")),
    );
    app.use(
      "/ressources/exam-copies",
      express.static(path.join(__dirname, "..", "uploads", "exam-copies")),
    );

    app.listen(PORT, () => {
      console.log(`Serveur démarré sur le port ${PORT}`);
    });
  } catch (error) {
    console.error(error);
  }
}

main();
