import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { QueryDto, ValidateFilter } from "@common";

class Filter {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber({}, { each: true })
  ids: number[];
}

export class FindUsersQueryDto extends QueryDto {
  @IsOptional()
  @ValidateFilter(Filter)
  filter?: Filter;

  includeDeleted?: boolean;
}
