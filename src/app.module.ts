import { Module, ValidationPipe } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { SequelizeModule } from "@nestjs/sequelize";
import { GlobalExceptionFilter } from "filters/global-exception.filter";
import { ResponseInterceptor } from "interceptors/response.interceptor";
import { KidsModule } from "modules/kids/kids.module";
import { MailModule } from "modules/mail/mail.module";
import { SmsModule } from "modules/sms/sms.module";
import { AcceptLanguageResolver, CookieResolver, HeaderResolver, I18nModule, QueryResolver } from "nestjs-i18n";
import * as path from "path";
import { RouteValidation } from "pipes/route-validation.pipe";
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
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    forbidNonWhitelisted: false,
  }),
};

const routeValidationProvider = {
  provide: APP_PIPE,
  useClass: RouteValidation,
};

const globalExceptionFilterProvider = {
  provide: APP_FILTER,
  useClass: GlobalExceptionFilter,
};

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: `./env/.${process.env.ENV || "prod"}.env`, isGlobal: true }),
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
    I18nModule.forRootAsync({
      useFactory: () => {
        return {
          fallbackLanguage: "en",
          loaderOptions: {
            path: path.join(__dirname, "/i18n/"),
            watch: true,
          },
        };
      },
      resolvers: [
        { use: QueryResolver, options: ["lang", "locale", "l"] },
        new HeaderResolver(["x-custom-lang"]),
        new CookieResolver(["lang", "locale", "l"]),
        AcceptLanguageResolver,
      ],
    }),
    AuthModule,
    KidsModule,
    UsersModule,
    MailModule,
    SmsModule,
  ],
  controllers: [],
  providers: [responseProvider, validationProvider, routeValidationProvider, globalExceptionFilterProvider],
})
export class AppModule {}
