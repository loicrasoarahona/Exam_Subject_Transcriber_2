import type { Request, Response } from "express";
import ExamSubjectRepository from "../repositories/exam-subject.repository.js";
import type { ExamSubjectAttributes } from "../types/interfaces.js";

export default class TestController {
  public static async testPersistSubject(req: Request, res: Response) {
  const entity: ExamSubjectAttributes = {
    filename: "filename_of_the_subject.txt",
    stat: {
      description: "une nouvelle stat",
      sections: [
        {
          theme: "hey hey, voici une nouvelle section",
          questions: [
            {
              questionNumber: "C1a",
              statement: "Que signifie 5,4N ?",
              questionType: "short_answer",
              points: 1,
              expectedAnswer: "Force de traction",
            },
          ],
        },
      ],
    },
  };

  ExamSubjectRepository.save(entity);

  res.json(entity);
  }
}
