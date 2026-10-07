import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database.js";
import { ExamSubject } from "./exam-subject.model.js";

export class ScoreExtraction extends Model { }

ScoreExtraction.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    extractionJson: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    examSubjectId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "ExamSubjects",
            key: "id"
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
    }
}, { sequelize, modelName: "ScoreExtraction" });

export async function setUpScoreExtractionAssociations() {
    ScoreExtraction.belongsTo(ExamSubject, { foreignKey: "examSubjectId", as: "examSubject", onDelete: "CASCADE" });
    ExamSubject.hasMany(ScoreExtraction, { foreignKey: "examSubjectId", as: "scoreExtractions" });
}