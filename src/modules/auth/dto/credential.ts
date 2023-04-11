import { IsEmail, IsNotEmpty, Matches } from "class-validator";

export class SignupDto {
  @IsEmail()
  email: string;

  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@#$%^&+=*!(){}[\]:;<>,.?\\\/\-_|]{8,}$/, {
    message: "password at least 8 character and include both word, number",
  })
  password: string;
}

export class SigninDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}
