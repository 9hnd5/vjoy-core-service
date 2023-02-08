import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SequelizeModule } from "@nestjs/sequelize";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { Role } from "entities/role.entity";
import { User } from "entities/user.entity";
import { Kid } from "modules/kids/entities/kid.entity";
import { KidsModule } from "modules/kids/kids.module";

const models = [Kid, Role, User];

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: `./env/.${process.env.NODE_ENV || "prod"}.env` }),
    SequelizeModule.forRoot({
      dialect: "mysql",
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT as string),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_SCHEMA,
      models: [...models],
    }),
    AuthModule,
    KidsModule,
    UsersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
