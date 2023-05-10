import { IsEmail, IsJSON, IsMobilePhone, IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";
import { PASSWORD_REGEX } from "../auth.constants";

export class SignupByEmailDto {
  @IsEmail()
  email: string;

  @Matches(PASSWORD_REGEX, {
    message: "password at least 8 character and include both word, number",
  })
  password: string;
}

export class SigninByEmailDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}

export class SignupByPhoneDto {
  @IsMobilePhone("vi-VN")
  phone: string;
}

export class SigninByPhoneDto {
  @IsMobilePhone("vi-VN")
  phone: string;
}

export class SigninByGoogleDto {
  @IsNotEmpty()
  @IsString()
  idToken: string;
}

export class ForgetPasswordDto {
  @IsEmail()
  email: string;
}

export class UpdatePasswordDto {
  @IsString()
  token: string;

  @Matches(PASSWORD_REGEX, {
    message: "password at least 8 character and include both word, number",
  })
  password: string;

  @IsString()
  confirmPassword: string;
}

export class SigninByAppleDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsNotEmpty()
  @IsString()
  idToken: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsJSON()
  user?: any;
}
