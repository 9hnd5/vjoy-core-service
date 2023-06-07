import { InitialModule, EnvironmentService } from "@common";
import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { camelCase } from "lodash";
import { AuthModule } from "modules/auth/auth.module";
import { ConfigModule } from "modules/config/config.module";
import { UserModule } from "modules/user/user.module";
import { KidModule } from "./modules/kid/kid.module";
import { RoleModule } from "./modules/role/role.module";
import * as path from "path";

const commonEntityPath = path.join(__dirname, "..", "nest-common-module/entities/*.entity*");
const coreEntityPath = path.join(__dirname, "entities/*.entity*");
@Module({
  imports: [
    InitialModule.forRoot({
      i18nPath: path.join(__dirname, "i18n"),
      i18nTypesOutputPath: path.resolve(__dirname, "../../src/i18n/i18n.generated.ts"),
    }),
    AuthModule,
    UserModule,
    KidModule,
    ConfigModule,
    SequelizeModule.forRootAsync({
      useFactory: (envService: EnvironmentService) => {
        return {
          dialect: "postgres",
          host: envService.get("DB_HOST"),
          port: envService.get("DB_PORT") as unknown as number,
          username: envService.get("DB_USER"),
          password: envService.get("DB_PASSWORD"),
          database: envService.get("DB_NAME"),
          retryDelay: 5000,
          retryAttempts: 0,
          logging: false,
          autoLoadModels: false,
          models: [commonEntityPath, coreEntityPath],
          modelMatch: (filename, exportMember) => {
            const modelName = camelCase(filename.substring(0, filename.indexOf(".entity"))).toLowerCase();
            return modelName === exportMember.toLowerCase();
          },
        };
      },
      inject: [EnvironmentService],
    }),
    RoleModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
