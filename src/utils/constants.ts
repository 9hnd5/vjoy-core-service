import { SequelizeModuleOptions } from "@nestjs/sequelize";
export const SEQUELIZE_OPTIONS = {
  dialect: "postgres",
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT as string),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_SCHEMA,
  retryDelay: 5000,
  retryAttempts: 3,
  autoLoadModels: true,
  logging: false,
} satisfies SequelizeModuleOptions;
