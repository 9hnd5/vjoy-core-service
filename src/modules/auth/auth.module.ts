import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { SequelizeModule } from "@nestjs/sequelize";
import { JWTAuthStrategy } from "src/modules/auth/strategies/jwt-auth.strategy";
import { Role } from "src/modules/auth/entities/role.entity";
import { AuthenticateGuard } from "src/modules/auth/guards/authenticate.guard";
import { AuthorizeGuard } from "src/modules/auth/guards/authorize.guard";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
  imports: [JwtModule.register({}), SequelizeModule.forFeature([Role])],
  controllers: [AuthController],
  providers: [
    AuthService,
    JWTAuthStrategy,
    {
      provide: APP_GUARD,
      useClass: AuthenticateGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AuthorizeGuard,
    },
  ],
  exports: [AuthService]
})
export class AuthModule {}
