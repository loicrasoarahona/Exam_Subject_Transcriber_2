import type { NextFunction, Request, Response } from "express";

export default class LockMiddlewareController {
  private static lockOllama = false;

  public static lockOllamaFunctionsMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    if (LockMiddlewareController.lockOllama) {
      return res.status(423).json({
        message: "Une opération est déjà en cours.",
      });
    }

    LockMiddlewareController.lockOllama = true;

    res.on("finish", () => {
      LockMiddlewareController.lockOllama = false;
    });

    res.on("close", () => {
      LockMiddlewareController.lockOllama = false;
    });

    next();
  }
}
