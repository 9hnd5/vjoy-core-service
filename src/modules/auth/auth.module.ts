import { ApiKey, Role, SmsModule, User } from "@common";
import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { HttpModule } from "@nestjs/axios";

@Module({
  imports: [HttpModule, SmsModule, SequelizeModule.forFeature([Role, User, ApiKey])],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
