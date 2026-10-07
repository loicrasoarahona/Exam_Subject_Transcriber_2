import { Op } from "sequelize";
import { Discipline } from "../models/discipline.model.js";
import type { DisciplineAttributes } from "../types/interfaces.js";

export default class DisciplineRepository {
  public static async findAll() {
    return Discipline.findAll();
  }

  public static async findByNameIgnoreCase(name: string) {
    return Discipline.findOne({
      where: {
        name: {
          [Op.iLike]: name,
        },
      },
    });
  }

  public static async save(item: DisciplineAttributes): Promise<Discipline> {
    return Discipline.create(item);
  }
}
