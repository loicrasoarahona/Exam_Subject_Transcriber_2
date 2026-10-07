import { DataTypes, Model } from "sequelize";
import type { DisciplineAttributes } from "../types/interfaces.js";
import sequelize from "../config/database.js";

export class Discipline extends Model<DisciplineAttributes> {}

Discipline.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  { sequelize, modelName: "Discipline" },
);
