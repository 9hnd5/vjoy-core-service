import { InitialModule } from "@common";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SequelizeModule } from "@nestjs/sequelize";
import { AuthModule } from "modules/auth/auth.module";
import { KidsModule } from "modules/kids/kids.module";
import { UsersModule } from "modules/users/users.module";

@Module({
  imports: [
    InitialModule,
    KidsModule,
    AuthModule,
    UsersModule,
    SequelizeModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        return {
          dialect: "postgres",
          host: configService.get("DB_HOST"),
          port: configService.get("DB_PORT"),
          username: configService.get("DB_USER"),
          password: configService.get("DB_PASSWORD"),
          database: configService.get("DB_NAME"),
          retryDelay: 5000,
          retryAttempts: 0,
          logging: false,
          autoLoadModels: true,
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
