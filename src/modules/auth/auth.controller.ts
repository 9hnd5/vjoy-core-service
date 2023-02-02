import { Body, Controller, Get, Post } from "@nestjs/common";
import { Authorize } from "src/modules/auth/decorators/authorize.decorator";
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
  @Get()
  get() {
    return "Ok";
  }

  @Post("/otp")
  otp() {
    return `sample`;
  }
}
