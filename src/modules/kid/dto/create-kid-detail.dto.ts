import { IsDateString, IsNotEmpty, IsOptional, Matches, MaxLength } from "class-validator";

export class CreateKidDetailDto {
  @IsOptional()
  @IsDateString()
  @MaxLength(10)
  dob?: string;

  @IsOptional()
  @Matches(/^[FM]$/)
  gender?: string;

  @IsOptional()
  @MaxLength(255)
  @IsNotEmpty()
  avatar?: string;

  @IsOptional()
  character?: string;
}
