import { ExamSubjectAnalysis } from "../models/exam-subject-analysis.model.js";
import { ExamSubjectQuestion } from "../models/exam-subject-question.model.js";
import { ExamSubjectSection } from "../models/exam-subject-section.model.js";
import type { ExamSubjectAnalysisAttributes } from "../types/interfaces.js";

export default class ExamSubjectAnalysisRepository {
  public static async save(entity: ExamSubjectAnalysisAttributes) {
    const savedEntity = await ExamSubjectAnalysis.create(entity, {
      include: [
        {
          model: ExamSubjectSection,
          as: "sections",
          include: [
            {
              model: ExamSubjectQuestion,
              as: "questions",
            },
          ],
        },
      ],
    });
    return ExamSubjectAnalysis.findByPk(savedEntity.dataValues.id, {
      include: [
        {
          model: ExamSubjectSection,
          as: "sections",
          include: [
            {
              model: ExamSubjectQuestion,
              as: "questions",
            },
          ],
        },
      ],
    });
  }
}
