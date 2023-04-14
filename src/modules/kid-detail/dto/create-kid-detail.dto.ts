import { IsDateString, IsNotEmpty, IsNumber, IsOptional, Matches, MaxLength, ValidateNested } from "class-validator";
class LearningGoalDto {
  @IsNumber()
  @IsOptional()
  d?: number;

  @IsNumber({}, { each: true })
  @IsOptional()
  w?: number[];
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
  profilePicture?: string;

  @IsOptional()
  @MaxLength(255)
  @IsNotEmpty()
  buddyCode?: string;

  @IsOptional()
  @MaxLength(255)
  @IsNotEmpty()
  buddyName?: string;

  @IsOptional()
  @IsNotEmpty()
  @ValidateNested()
  learningGoal?: LearningGoalDto;

  @IsOptional()
  @IsNumber()
  levelId?: number;
}
