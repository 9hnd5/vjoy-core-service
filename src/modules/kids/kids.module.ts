import { CoreDbModule, Kid, User } from "@common";
import { Module } from "@nestjs/common";
import { KidsController } from "./kids.controller";
import { KidsService } from "./kids.service";

@Module({
  imports: [CoreDbModule.forFeature([Kid, User])],
  controllers: [KidsController],
  providers: [KidsService],
})
export class KidsModule {}
