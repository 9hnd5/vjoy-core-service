import { IsEmail, IsIn, IsNotEmpty, IsOptional } from "class-validator";
import { ROLE_CODE } from "@common";

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

  @IsIn(Object.values(ROLE_CODE))
  roleCode: string;

  @IsOptional()
  provider?: string;

  @IsOptional()
  socialId?: string;
}
