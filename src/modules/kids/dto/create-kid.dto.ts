
import { IsNotEmpty, IsNumber, IsOptional, Matches, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class LearningGoalDTO {
  @IsNumber()
  @IsOptional()
  d?: number;

  @IsNumber({}, {each: true}) 
  @IsOptional()
  w?: number[];
}

export class CreateKidDto {
  @IsNotEmpty()
  firstname: string;

  @IsNotEmpty()
  lastname: string;

  @Matches(/^\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$/g, { message: "dob must be a valid YYYY-MM-DD date string"})
  dob: string;

  @Matches(/^[FM]$/g, { message: "gender must be M or F" })
  gender: string;

  @IsNumber()
  parentId: number;

  @IsNumber()
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
  @Type(() => LearningGoalDTO)
  learningGoal?: LearningGoalDTO;
}
