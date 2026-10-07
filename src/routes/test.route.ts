import { Router } from "express";
import TestController from "../controllers/test.controller.js";

const router = Router()

router.get('/test-persist', TestController.testPersistSubject)

export default router