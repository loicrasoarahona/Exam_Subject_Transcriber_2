import { ExamCopyQuestionResult } from "../models/exam-copy-question-result.model.js";
import { ExamCopySectionResult } from "../models/exam-copy-section-result.model.js";
import { ExamCopyAnalysis } from "../models/exam-copy-analysis.model.js";
import type { ExamCopyAnalysisAttributes } from "../types/exam-copy.types.js";

export default class ExamCopyAnalysisRepository {
  public static async save(item: ExamCopyAnalysisAttributes) {
    return ExamCopyAnalysis.create(item, {
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
    });
  }
}
