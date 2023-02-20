import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { AuthModule } from "modules/auth/auth.module";
import { Role } from "entities/role.entity";
import { User } from "entities/user.entity";
import { RolesController } from "./roles.controller";
import { RolesService } from "./roles.service";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { SmsModule } from "modules/sms/sms.module";

@Module({
  imports: [AuthModule, SmsModule, SequelizeModule.forFeature([Role, User])],
  controllers: [RolesController, UsersController],
  providers: [RolesService, UsersService],
})
export class UsersModule {}
