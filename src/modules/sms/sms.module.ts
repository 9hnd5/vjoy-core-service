import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { SMSService } from "./sms.service";

@Module({
  imports: [HttpModule],
  providers: [SMSService],
  exports: [SMSService]
})
export class SMSModule {}
