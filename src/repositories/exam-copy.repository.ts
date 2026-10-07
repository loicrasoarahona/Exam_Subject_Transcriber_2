import { ExamCopy } from "../models/exam-copy.model.js";
import { ExamCopyQuestionResult } from "../models/exam-copy-question-result.model.js";
import { ExamCopySectionResult } from "../models/exam-copy-section-result.model.js";
import { ExamCopyAnalysis } from "../models/exam-copy-analysis.model.js";
import type { ExamCopyAttributes } from "../types/exam-copy.types.js";

export default class ExamCopyRepository {
  public static async save(entity: ExamCopyAttributes) {
    return ExamCopy.create(entity);
  }

  public static async findById(id: number) {
    return ExamCopy.findByPk(id, {
      include: [
        {
          model: ExamCopyAnalysis,
          as: "analysis",
          include: [
            {
              model: ExamCopySectionResult,
              as: "sectionResults",
              include: [
                {
                  model: ExamCopyQuestionResult,
                  as: "questionResults",
                },
              ],
            },
          ],
        },
      ],
    });
  }

  public static async deleteAnalysis(id: number) {
    return ExamCopyAnalysis.destroy({ where: { examCopyId: id } });
  }
}
