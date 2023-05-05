import { ApiKey, MailModule, Role, SmsModule, User } from "@common";
import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { OtpToken } from "entities/otp-token.entity";

@Module({
  imports: [MailModule, SmsModule, SequelizeModule.forFeature([Role, User, ApiKey, OtpToken])],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
