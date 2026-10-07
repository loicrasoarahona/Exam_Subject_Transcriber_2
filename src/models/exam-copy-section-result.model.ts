import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database.js";
import { ExamCopyAnalysis } from "./exam-copy-analysis.model.js";
import { ExamSubjectSection } from "./exam-subject-section.model.js";
import type { ExamCopySectionResultAttributes } from "../types/exam-copy.types.js";

export class ExamCopySectionResult extends Model<ExamCopySectionResultAttributes> {}

ExamCopySectionResult.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    copyAnalysisId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: ExamCopyAnalysis,
        key: "id",
      },
    },
    examSubjectSectionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: ExamSubjectSection,
        key: "id",
      },
    },
  },
  { sequelize, modelName: "ExamCopySectionResult" },
);
