import { IsNotEmpty, IsNumberString, IsString } from "class-validator";

export class VerifyOtpDto {
  @IsNumberString()
  otpCode: string;

  @IsNotEmpty()
  @IsString()
  otpToken: string;
}
