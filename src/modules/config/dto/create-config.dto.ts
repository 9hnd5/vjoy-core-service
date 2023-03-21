import { IsJSON, IsNotEmpty, IsOptional } from "class-validator";

export class CreateConfigDto {
  @IsNotEmpty()
  type: string;

  @IsOptional()
  @IsJSON()
  data?: any;
}
