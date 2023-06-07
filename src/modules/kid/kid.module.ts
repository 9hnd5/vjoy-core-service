import { KidDetail, User } from "@common";
import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { KidController } from "./kid.controller";
import { KidService } from "./kid.service";

@Module({
  imports: [SequelizeModule.forFeature([User, KidDetail])],
  providers: [KidService],
  controllers: [KidController],
})
export class KidModule {}
