import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { SequelizeModule } from "@nestjs/sequelize";
import { Role } from "entities/role.entity";
import { User } from "entities/user.entity";
import { SmsModule } from "modules/sms/sms.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthenticateGuard } from "./guards/authenticate.guard";
import { AuthorizeGuard } from "./guards/authorize.guard";
import { JwtAuthStrategy } from "./strategies/jwt-auth.strategy";

@Module({
  imports: [JwtModule.register({}), SmsModule, SequelizeModule.forFeature([Role, User])],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthStrategy,
    {
      provide: APP_GUARD,
      useClass: AuthenticateGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AuthorizeGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
