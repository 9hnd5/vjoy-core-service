
import { IsEmail, IsNotEmpty, IsNumberString, IsOptional } from "class-validator";

export class CreateUserDto {
  @IsNotEmpty()
  firstname: string;

  @IsNotEmpty()
  lastname: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsNumberString()
  phone?: string;

  @IsNotEmpty()
  role: number;

  provider?: string;

  socialId?: string;
}
