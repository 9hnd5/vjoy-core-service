import { Kid, User } from "@common";
import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { KidsController } from "./kids.controller";
import { KidsService } from "./kids.service";

@Module({
  imports: [SequelizeModule.forFeature([Kid, User])],
  controllers: [KidsController],
  providers: [KidsService],
})
export class KidsModule {}
