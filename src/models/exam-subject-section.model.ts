import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database.js";
import { ExamSubjectAnalysis } from "./exam-subject-analysis.model.js";
import type { ExamSubjectSectionAttributes } from "../types/interfaces.js";

export class ExamSubjectSection extends Model<ExamSubjectSectionAttributes> {}

ExamSubjectSection.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    subjectAnalysisId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: ExamSubjectAnalysis,
        key: "id",
      },
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    sectionCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    theme: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    declaredPoints: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    context: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  { sequelize, modelName: "ExamSubjectSection" },
);
