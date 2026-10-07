import type { Request, Response } from "express";
import DisciplineRepository from "../repositories/discipline.repository.js";

export default class DisciplineController {
  public static async findAll(req: Request, res: Response) {
    return res.json(await DisciplineRepository.findAll());
  }
}
