import { Module } from "@nestjs/common";
import { KidsService } from "./kids.service";
import { KidsController } from "./kids.controller";
import { SequelizeModule } from "@nestjs/sequelize";
import { Kid } from "entities/kid.entity";
import { UsersModule } from "modules/users/users.module";

@Module({
  imports: [UsersModule, SequelizeModule.forFeature([Kid])],
  controllers: [KidsController],
  providers: [KidsService],
})
export class KidsModule {}
