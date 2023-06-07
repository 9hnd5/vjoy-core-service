import { MailModule, Role, SmsModule, User } from "@common";
import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { AuthModule } from "modules/auth/auth.module";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";

@Module({
  imports: [AuthModule, MailModule, SmsModule, SequelizeModule.forFeature([Role, User])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
