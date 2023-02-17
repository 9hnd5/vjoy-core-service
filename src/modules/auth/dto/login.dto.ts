import { Exclude, Expose } from "class-transformer";
import { IsEmail, IsNotEmpty, IsString, ValidateIf } from "class-validator";

@Exclude()
export class LoginDto {
  @Expose()
  @IsNotEmpty()
  type: "email" | "phone";

  @Expose()
  @ValidateIf((o) => o.type === "phone")
  @IsNotEmpty()
  @IsString()
  phone: string;

  @Expose()
  @ValidateIf((o) => o.type === "email")
  @IsEmail()
  email: string;

  @Expose()
  @ValidateIf((o) => o.type === "email")
  @IsNotEmpty()
  @IsString()
  password: string;
}
