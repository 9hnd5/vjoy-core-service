import { ApiKey, CoreDbModule, Role, User, SmsModule } from "@common";
import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
  imports: [SmsModule, CoreDbModule.forFeature([Role, User, ApiKey])],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
