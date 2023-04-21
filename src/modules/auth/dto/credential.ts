import { IsEmail, IsNotEmpty, Matches, IsMobilePhone } from "class-validator";
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

  // @Matches(PASSWORD_REGEX, {
  //   message: "password at least 8 character and include both word, number",
  // })
  // password: string;
}

export class SigninByPhoneDto {
  @IsMobilePhone("vi-VN")
  phone: string;

  // @IsNotEmpty()
  // password: string;
}
