import { IsEmail, IsIn, IsNotEmpty, IsOptional } from "class-validator";
import { ROLE_ID } from "@common";

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

  @IsIn(Object.values(ROLE_ID))
  roleId: string;

  @IsOptional()
  provider?: string;

  @IsOptional()
  socialId?: string;
}
