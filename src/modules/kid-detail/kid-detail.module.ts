import { KidDetail, User } from "@common";
import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { KidDetailController } from "./kid-detail.controller";
import { KidDetailService } from "./kid-detail.service";

@Module({
  imports: [SequelizeModule.forFeature([KidDetail, User])],
  controllers: [KidDetailController],
  providers: [KidDetailService],
})
export class KidDetailModule {}
