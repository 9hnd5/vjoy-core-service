import { AdminOrSameUser, Authorize, Controller, Public } from "@common";
import { Body, Delete, Get, Param, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { CreateApiKeyDto } from "./dto/create-api-key.dto";
import { LoginDto } from "./dto/login.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { SigninByEmailDto, SigninByPhoneDto, SignupByEmailDto, SignupByPhoneDto } from "./dto/credential";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
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

  @Public()
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

  @Public()
  @Post("signin/email")
  signinByEmail(@Body() data: SigninByEmailDto) {
    return this.authService.signin(data);
  }

  @Public()
  @Post("signup/email")
  signupByEmail(@Body() data: SignupByEmailDto) {
    return this.authService.signup(data);
  }

  @Public()
  @Post("signin/phone")
  signinByPhone(@Body() data: SigninByPhoneDto) {
    return this.authService.signin(data);
  }

  @Public()
  @Post("signup/phone")
  signupByPhone(@Body() data: SignupByPhoneDto) {
    return this.authService.signup(data);
  }
}
