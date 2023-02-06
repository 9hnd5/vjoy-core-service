
import { IsEmail, IsNotEmpty } from "class-validator";

export class CreateUserDto {
  @IsNotEmpty()
  firstname: string;

  @IsNotEmpty()
  lastname: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  phone?: string;

  @IsNotEmpty()
  roleId: number;

  provider?: string;

  socialId?: string;
}
