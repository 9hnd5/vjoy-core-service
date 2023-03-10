import { MailModule, Role, SmsModule, User } from "@common";
import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { AuthModule } from "modules/auth/auth.module";
import { RolesController } from "./roles.controller";
import { RolesService } from "./roles.service";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [AuthModule, MailModule, SmsModule, SequelizeModule.forFeature([Role, User])],
  controllers: [RolesController, UsersController],
  providers: [RolesService, UsersService],
  exports: [RolesService],
})
export class UsersModule {}
