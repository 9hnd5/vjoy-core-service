import { Type } from "class-transformer";
import { IsDefined, IsNotEmpty, IsNumber, IsOptional, IsPositive, Matches, Min, ValidateNested } from "class-validator";

class LearningGoalDto {
  @IsNumber()
  @IsOptional()
  d?: number;

  @IsNumber({}, { each: true })
  @IsOptional()
  w?: number[];
}

export class CreateKidDto {
  @IsNotEmpty()
  firstname: string;

  @IsDefined()
  lastname: string;

  @Matches(/^\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$/, {
    message: "dob must be a valid YYYY-MM-DD date string",
  })
  dob: string;

  @Matches(/^[FM]$/, { message: "gender must be M or F" })
  gender: string;

  @IsPositive()
  parentId: number;

  @IsNumber()
  @IsOptional()
  roleId: number;

  @IsOptional()
  profilePicture?: string;

  @IsOptional()
  avatarCode?: string;

  @IsOptional()
  buddyCode?: string;

  @IsOptional()
  buddyName?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LearningGoalDto)
  learningGoal?: LearningGoalDto;
}
