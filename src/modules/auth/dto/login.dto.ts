import { IsEmail, IsNotEmpty, IsString, ValidateIf } from "class-validator";

export class LoginDto {
  @IsNotEmpty()
  type: "email" | "phone";

  @ValidateIf((o) => o.type === "phone")
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ValidateIf((o) => o.type === "email")
  @IsEmail()
  email: string;

  @ValidateIf((o) => o.type === "email")
  @IsNotEmpty()
  @IsString()
  password: string;
}
