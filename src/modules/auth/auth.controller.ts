import { Body, Get, Param, Post } from "@nestjs/common";
import { Controller } from "decorators/controller.decorator";
import { AuthService } from "./auth.service";
import { AdminOrSameUser } from "./decorators/admin-or-same-user.decorator";
import { Authorize } from "./decorators/authorize.decorator";
import { LoginDTO } from "./dto/login.dto";
import { VerifyOTP } from "./dto/verify-otp.dto";

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
    return `User ${userId} the same`;
  }

  @Post("otp")
  verifyOTP(@Body() data: VerifyOTP) {
    return this.authService.verifyOTP(data.otpToken, data.otpCode);
  }
}
