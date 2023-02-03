import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { Authorize } from "src/modules/auth/decorators/authorize.decorator";
import { SameUser } from "src/modules/auth/decorators/same-user.decorator";
import { LoginDTO } from "src/modules/auth/dto/login.dto";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("/login")
  login(@Body() data: LoginDTO) {
    return this.authService.login(data);
  }
  @Authorize({ action: "read", resource: "live_sessions" })
  @Get("check-authorize")
  checkAuthorize() {
    return "Authorized";
  }

  @Get("check-same-user/:userId")
  @SameUser()
  checkSameUser(@Param("userId") userId: unknown) {
    return "User is the same";
  }

  @Post("/otp")
  otp() {
    return `sample`;
  }
}
