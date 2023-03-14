import { ROLE_CODE } from "@common";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, Length, Matches, ValidateNested } from "class-validator";

class LearningGoalDto {
  @IsNumber()
  @IsOptional()
  d?: number;

  @IsNumber({}, { each: true })
  @IsOptional()
  w?: number[];
}

export class CreateKidByAdminDto {
  @IsNotEmpty()
  @Length(1, 255)
  firstname: string;

  @IsNotEmpty()
  @Length(1, 255)
  lastname: string;

  @Matches(/^\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$/, {
    message: "dob must be a valid YYYY-MM-DD date string",
  })
  dob: string;

  @Matches(/^[FM]$/, { message: "gender must be M or F" })
  gender: string;

  @IsInt()
  @IsPositive()
  parentId: number;

  @IsIn(Object.values(ROLE_CODE))
  roleCode: string;

  @IsOptional()
  @Length(1, 255)
  profilePicture?: string;

  @IsOptional()
  @Length(1, 255)
  avatarCode?: string;

  @IsOptional()
  @Length(1, 255)
  buddyCode?: string;

  @IsOptional()
  @Length(1, 255)
  buddyName?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LearningGoalDto)
  learningGoal?: LearningGoalDto;
}
