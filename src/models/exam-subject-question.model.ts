import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database.js";
import { ExamSubjectSection } from "./exam-subject-section.model.js";
import type { ExamSubjectQuestionAttributes } from "../types/interfaces.js";

export class ExamSubjectQuestion extends Model<ExamSubjectQuestionAttributes> {}

ExamSubjectQuestion.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    sectionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: ExamSubjectSection,
        key: "id",
      },
    },
    questionNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    printedNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    statement: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    questionType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    points: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    context: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    figure: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    expectedAnswer: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    partialCredit: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    needsReview: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    options: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  { sequelize, modelName: "ExamSubjectQuestion" },
);
