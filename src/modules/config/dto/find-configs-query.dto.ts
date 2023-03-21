import { QueryDto, ValidateFilter } from "@common";
import { Allow, IsOptional } from "class-validator";

class Filter {
  @Allow()
  type?: string;
}

export class FindConfigsQueryDto extends QueryDto {
  @IsOptional()
  @ValidateFilter(Filter)
  filter?: Filter;
}
