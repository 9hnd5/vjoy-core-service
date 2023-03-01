import { IsOptional } from "class-validator";
import { QueryDto } from "dtos/query.dto";

export class QueryUserDto extends QueryDto {
    @IsOptional()
    filter?: string
}
