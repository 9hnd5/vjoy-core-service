import { PartialType } from "@nestjs/mapped-types";
import { IsNumber, IsOptional, IsString } from "class-validator";
import { CreateUserDto } from "./create-user.dto";

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsString()
  @IsOptional()
  password?: string;

  @IsNumber()
  @IsOptional()
  status?: number;

  @IsString()
  @IsOptional()
  kidName?: string;
}
