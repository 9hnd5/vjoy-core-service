import { SequelizeModule } from '@nestjs/sequelize';

export const DatabaseModule = SequelizeModule.forRoot({
  dialect: 'mysql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_SCHEMA,
  models: [],
});