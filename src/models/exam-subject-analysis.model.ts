import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database.js";
import { ExamSubject } from "./exam-subject.model.js";
import type { ExamSubjectAnalysisAttributes } from "../types/interfaces.js";

export class ExamSubjectAnalysis extends Model<ExamSubjectAnalysisAttributes> {}

ExamSubjectAnalysis.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    subjectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: ExamSubject,
        key: "id",
      },
    },
    description: {
      type: DataTypes.TEXT,
    },
    discipline: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    warnings: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
  },
  { sequelize, modelName: "ExamSubjectAnalysis" },
);
