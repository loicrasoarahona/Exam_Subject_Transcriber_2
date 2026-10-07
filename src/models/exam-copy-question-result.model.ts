import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database.js";
import { ExamCopySectionResult } from "./exam-copy-section-result.model.js";
import { ExamSubjectQuestion } from "./exam-subject-question.model.js";
import type { ExamCopyQuestionResultAttributes } from "../types/exam-copy.types.js";

export class ExamCopyQuestionResult extends Model<ExamCopyQuestionResultAttributes> {}

ExamCopyQuestionResult.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    sectionResultId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: ExamCopySectionResult,
        key: "id",
      },
    },
    examQuestionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: ExamSubjectQuestion,
        key: "id",
      },
    },
    score: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
  },
  { sequelize, modelName: "ExamCopyQuestionResult" },
);
