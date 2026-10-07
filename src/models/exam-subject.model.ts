import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database.js";
import type { ExamSubjectAttributes } from "../types/interfaces.js";
import { Discipline } from "./discipline.model.js";

export class ExamSubject extends Model<ExamSubjectAttributes> {}

ExamSubject.init(
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
    disciplineId: {
      type: DataTypes.INTEGER,
      references: {
        model: Discipline,
        key: "id",
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  { sequelize, modelName: "ExamSubject" },
);
