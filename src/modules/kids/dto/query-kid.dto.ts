import { IsOptional } from "class-validator";
import { QueryDto } from "@common";

export class QueryKidDto extends QueryDto {
  @IsOptional()
  filter?: string;

  includeDeleted?: boolean;
}
