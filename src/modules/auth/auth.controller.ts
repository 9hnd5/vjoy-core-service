import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { Authorize } from "src/modules/auth/decorators/authorize.decorator";
import { AdminOrSameUser } from "src/modules/auth/decorators/admin-or-same-user.decorator";
import { LoginDTO } from "src/modules/auth/dto/login.dto";
import { VerifyOTP } from "src/modules/auth/dto/verify-otp.dto";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  login(@Body() data: LoginDTO) {
    return this.authService.login(data);
  }
  @Authorize({ action: "read", resource: "live_sessions" })
  @Get("check-authorize")
  checkAuthorize() {
    return "Authorized";
  }

  @Get("check-same-user/:userId")
  @AdminOrSameUser()
  checkSameUser(@Param("userId") userId: unknown) {
    return "User is the same";
  }

  @Post("otp")
  verifyOTP(@Body() data: VerifyOTP) {
    return this.authService.verifyOTP(data.otpToken, data.otpCode);
  }
}
