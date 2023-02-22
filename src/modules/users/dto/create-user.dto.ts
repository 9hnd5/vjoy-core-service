
import { IsEmail, IsNotEmpty, IsNumber, IsOptional } from "class-validator";

export class CreateUserDto {
  @IsNotEmpty()
  firstname: string;

  @IsNotEmpty()
  lastname: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsOptional()
  password?: string;

  @IsOptional()
  @IsNotEmpty()
  phone?: string;

  @IsNumber()
  roleId: number;

  @IsOptional()
  provider?: string;

  @IsOptional()
  socialId?: string;
}
