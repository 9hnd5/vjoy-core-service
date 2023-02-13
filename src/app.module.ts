import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SequelizeModule } from "@nestjs/sequelize";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { Kid } from "entities/kid.entity";
import { Role } from "entities/role.entity";
import { User } from "entities/user.entity";
import { KidsModule } from "modules/kids/kids.module";
import { SequelizeOptions } from "utils/sequelize-options";

const models = [Kid, Role, User];

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: `./env/.${process.env.NODE_ENV || "prod"}.env` }),
    SequelizeModule.forFeature(models),
    SequelizeModule.forRoot(SequelizeOptions()),
    AuthModule,
    KidsModule,
    UsersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
