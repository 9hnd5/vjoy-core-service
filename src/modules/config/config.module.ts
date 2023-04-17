import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { Config } from "@common";
import { ConfigController } from "./config.controller";
import { ConfigService } from "./config.service";

@Module({
  imports: [SequelizeModule.forFeature([Config])],
  controllers: [ConfigController],
  providers: [ConfigService],
})
export class ConfigModule {}
