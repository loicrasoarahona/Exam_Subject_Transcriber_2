import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database.js";
import { ExamCopy } from "./exam-copy.model.js";
import type { ExamCopyAnalysisAttributes } from "../types/exam-copy.types.js";

export class ExamCopyAnalysis extends Model<ExamCopyAnalysisAttributes> {}

ExamCopyAnalysis.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    examCopyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: ExamCopy,
        key: "id",
      },
    },
    studentName: {
      type: DataTypes.STRING,
    },
    totalScore: {
      type: DataTypes.FLOAT,
    },
    maxScore: {
      type: DataTypes.FLOAT,
    },
  },
  { sequelize, modelName: "ExamCopyAnalysis" },
);
