import { QueryDto, ValidateFilter } from "@common";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

class Filter {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  type?: string;
}

export class FindConfigsQueryDto extends QueryDto {
  @IsOptional()
  @ValidateFilter(Filter)
  filter?: Filter;
}
