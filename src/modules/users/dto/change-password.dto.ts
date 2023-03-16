import { IsNotEmpty, IsOptional } from "class-validator";

export class ChangePasswordDto {
  @IsOptional()
  @IsNotEmpty()
  oldPassword?: string;

  @IsNotEmpty()
  newPassword: string;
}
