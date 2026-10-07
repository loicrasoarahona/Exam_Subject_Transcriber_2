import type { Request, Response } from "express";

export default class CorrectCopyController {
  public static correctCopyController(req: Request, res: Response) {
    res.json("Bonjour");
  }
}
