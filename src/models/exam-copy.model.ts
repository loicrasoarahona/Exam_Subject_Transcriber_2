import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database.js";
import { ExamSubject } from "./exam-subject.model.js";
import type { ExamCopyAttributes } from "../types/exam-copy.types.js";

export class ExamCopy extends Model<ExamCopyAttributes> {}

ExamCopy.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    examSubjectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: ExamSubject,
        key: "id",
      },
    },
  },
  { sequelize, modelName: "ExamCopy" },
);
