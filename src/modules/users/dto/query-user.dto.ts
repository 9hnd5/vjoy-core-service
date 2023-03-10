import { IsOptional } from "class-validator";
import { QueryDto } from "@common";

export class QueryUserDto extends QueryDto {
  @IsOptional()
  filter?: string;
}
