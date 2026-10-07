import DisciplineRepository from "../repositories/discipline.repository.js";
import sequelize from "./database.js";

const defaultDisciplines: string[] = ["Physique-Chimie", "Mathématique", "SVT"];

export async function initDB() {
  await sequelize.authenticate();
  console.log("Connexion PostgreSQL OK");

  await sequelize.sync({ alter: true });
}

export async function createDisciplineDefaultData() {
  for (const name of defaultDisciplines) {
    if (!(await DisciplineRepository.findByNameIgnoreCase(name))) {
      await DisciplineRepository.save({ name });
    }
  }
}
