import { ExamCopy } from "../models/exam-copy.model.js";
import { ExamCopyAnalysis } from "../models/exam-copy-analysis.model.js";
import { ExamSubject } from "../models/exam-subject.model.js";
import { ExamSubjectQuestion } from "../models/exam-subject-question.model.js";
import { ExamSubjectSection } from "../models/exam-subject-section.model.js";
import { ExamSubjectAnalysis } from "../models/exam-subject-analysis.model.js";
import type { ExamSubjectAttributes } from "../types/interfaces.js";
import { Discipline } from "../models/discipline.model.js";
import { ExamCopySectionResult } from "../models/exam-copy-section-result.model.js";
import { ExamCopyQuestionResult } from "../models/exam-copy-question-result.model.js";

export default class ExamSubjectRepository {
  public static async findAllCopies(id: number) {
    return ExamCopy.findAll({
      where: { examSubjectId: id },
      include: [
        {
          model: ExamCopyAnalysis,
          as: "analysis",
        },
      ],
    });
  }

  public static async findAll() {
    return await ExamSubject.findAll({
      include: [
        {
          model: ExamSubjectAnalysis,
          as: "analysis",
        },
        {
          model: Discipline,
          as: "discipline",
        },
      ],
    });
  }

  public static async findById(id: number) {
    return await ExamSubject.findByPk(id, {
      include: [
        {
          model: ExamSubjectAnalysis,
          as: "analysis",
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
        },
        {
          model: Discipline,
          as: "discipline",
        },
      ],
    });
  }

  public static async findAllCopiesComplete(id: number) {
    return ExamCopy.findAll({
      where: { examSubjectId: id },
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

  public static async save(examSubject: ExamSubjectAttributes) {
    return ExamSubject.create(examSubject, {
      include: [
        {
          model: ExamSubjectAnalysis,
          as: "analysis",
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
        },
      ],
    });
  }

  public static async deleteAnalysis(examSubjectId: number) {
    ExamSubjectAnalysis.destroy({ where: { subjectId: examSubjectId } });
  }
}
