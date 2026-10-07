import { Router } from "express";
import DisciplineController from "../controllers/discipline.controller.js";

const router = Router();

router.get("/", DisciplineController.findAll);

export default router;
