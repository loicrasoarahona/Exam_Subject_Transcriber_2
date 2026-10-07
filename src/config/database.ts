import { Sequelize } from "sequelize";

const sequelize = new Sequelize(
    "exam_stats",
    "postgres",
    "anjomakely",
    {
        host: "localhost",
        dialect: "postgres",
        logging: false
    }
);

export default sequelize;