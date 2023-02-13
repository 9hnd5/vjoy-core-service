import { Exclude, Expose } from "class-transformer";
import { IsNotEmpty, IsNumberString, IsString } from "class-validator";

@Exclude()
export class VerifyOTP {
  @Expose()
  @IsNumberString()
  otpCode: string;

  @Expose()
  @IsNotEmpty()
  @IsString()
  otpToken: string;
}