import { Module, UnprocessableEntityException, ValidationError, ValidationPipe } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { SequelizeModule } from "@nestjs/sequelize";
import { ResponseInterceptor } from "interceptors/response.interceptor";
import { KidsModule } from "modules/kids/kids.module";
import { SmsModule } from "modules/sms/sms.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";

const responseProvider = {
  provide: APP_INTERCEPTOR,
  useValue: new ResponseInterceptor(),
};

const validationProvider = {
  provide: APP_PIPE,
  useValue: new ValidationPipe({
    whitelist: true,
    exceptionFactory(errors: ValidationError[]) {
      return new UnprocessableEntityException(errors);
    },
  }),
};

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: `./env/.${process.env.NODE_ENV || "prod"}.env`, isGlobal: true }),
    SequelizeModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        return {
          dialect: "postgres",
          host: configService.get("DB_HOST"),
          port: configService.get("DB_PORT"),
          username: configService.get("DB_USER"),
          password: configService.get("DB_PASSWORD"),
          database: configService.get("DB_SCHEMA"),
          retryDelay: 5000,
          retryAttempts: 0,
          autoLoadModels: true,
          logging: false,
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    KidsModule,
    UsersModule,
    SmsModule
  ],
  controllers: [],
  providers: [responseProvider, validationProvider],
})
export class AppModule {}
