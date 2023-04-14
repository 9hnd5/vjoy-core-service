import { MailModule, Role, SmsModule, User } from "@common";
import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { AuthModule } from "modules/auth/auth.module";
import { RoleController } from "./role.controller";
import { RoleService } from "./role.service";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";

@Module({
  imports: [AuthModule, MailModule, SmsModule, SequelizeModule.forFeature([Role, User])],
  controllers: [RoleController, UserController],
  providers: [RoleService, UserService],
  exports: [RoleService],
})
export class UserModule {}
