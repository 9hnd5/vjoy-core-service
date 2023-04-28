import { AdminOrSameUser, Authorize, Controller, Public } from "@common";
import { Body, Delete, Get, Param, Post, Query, Res } from "@nestjs/common";
import { Response } from "express";
import { AuthService } from "./auth.service";
import { CreateApiKeyDto } from "./dto/create-api-key.dto";
import {
  ForgetPasswordDto,
  SigninByEmailDto,
  SigninByGoogleDto,
  SigninByPhoneDto,
  SignupByEmailDto,
  SignupByPhoneDto,
} from "./dto/credential";
import { VerifyOtpDto } from "./dto/verify-otp.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
    return this.authService.signinByEmail(data);
  }

  @Public()
  @Post("signup/email")
  signupByEmail(@Body() data: SignupByEmailDto) {
    return this.authService.signupByEmail(data);
  }

  @Public()
  @Post("signin/phone")
  signinByPhone(@Body() data: SigninByPhoneDto) {
    return this.authService.signinByPhone(data);
  }

  @Public()
  @Post("signup/phone")
  signupByPhone(@Body() data: SignupByPhoneDto) {
    return this.authService.signupByPhone(data);
  }

  @Public()
  @Post("resend-otp")
  resendOtp(@Body() data: SigninByPhoneDto) {
    return this.authService.signinByPhone(data);
  }

  @Public()
  @Post("signin/google")
  signinByGoogle(@Body() data: SigninByGoogleDto) {
    return this.authService.signinByGoogle(data);
  }

  @Public()
  @Post("forget-password")
  forgetPassword(@Body() data: ForgetPasswordDto) {
    return this.authService.forgetPassword(data);
  }

  @Public({ requireApiKey: false })
  @Get("verify-email")
  verifyEmail(@Query("email") email: string, @Query("token") token: string, @Res() res: Response) {
    return this.authService.verifyEmail(email, token, res);
  }

  @Public({ requireApiKey: false })
  @Get("verify-email/:email/resend")
  resendVerifyEmail(@Param("email") email: string) {
    return this.authService.resendVerifyEmail(email);
  }
}
