import { Body, Delete, Get, Param, Post } from "@nestjs/common";
import { Controller } from "decorators/controller.decorator";
import { AuthService } from "./auth.service";
import { AdminOrSameUser } from "./decorators/admin-or-same-user.decorator";
import { Authorize } from "./decorators/authorize.decorator";
import { CreateApiKeyDto } from "./dto/create-api-key.dto";
import { LoginDto } from "./dto/login.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  login(@Body() data: LoginDto) {
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
  verifyOTP(@Body() data: VerifyOtpDto) {
    return this.authService.verifyOTP(data.otpToken, data.otpCode);
  }

  @Post("api-key")
  @AdminOrSameUser()
  createApiKey(@Body() data: CreateApiKeyDto) {
    return this.authService.createApiKey(data);
  }

  @Delete("api-key/:id")
  @AdminOrSameUser()
  deleteApiKey(@Param("id") id: number) {
    return this.authService.deleteApiKey(id);
  }
}
