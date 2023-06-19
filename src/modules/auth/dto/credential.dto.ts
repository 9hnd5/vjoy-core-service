import { Transform } from "class-transformer";
import { IsEmail, IsMobilePhone, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator";
import { parsePhoneNumber } from "libphonenumber-js";
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
  @Transform(({ value }) => {
    try {
      return parsePhoneNumber(value, "VN").formatNational().replace(/\s/g, "");
    } catch (err) {
      throw err;
    }
  })
  @IsMobilePhone("vi-VN")
  phone: string;
}

export class SigninByPhoneDto {
  @Transform(({ value }) => {
    try {
      return parsePhoneNumber(value, "VN").formatNational().replace(/\s/g, "");
    } catch (err) {
      throw err;
    }
  })
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
  @MaxLength(255)
  @IsNotEmpty()
  firstname?: string;

  @IsOptional()
  @MaxLength(255)
  @IsNotEmpty()
  lastname?: string;

  @IsOptional()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  idToken: string;
}
