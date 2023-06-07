import { Type } from "class-transformer";
import { IsDateString, IsNotEmpty, IsOptional, Matches, MaxLength, ValidateNested } from "class-validator";

class Character {
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  url: string;
}

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
  @ValidateNested()
  @Type(() => Character)
  character?: Character;
}
