import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { SequelizeModule } from "@nestjs/sequelize";
import { Role } from "entities/role.entity";
import { User } from "entities/user.entity";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthenticateGuard } from "./guards/authenticate.guard";
import { AuthorizeGuard } from "./guards/authorize.guard";
import { JWTAuthStrategy } from "./strategies/jwt-auth.strategy";

@Module({
  imports: [JwtModule.register({}), SequelizeModule.forFeature([Role, User])],
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
  exports: [AuthService],
})
export class AuthModule {}
