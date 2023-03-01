import { IsOptional } from "class-validator";
import { QueryDto } from "dtos/query.dto";

export class QueryKidDto extends QueryDto {
    @IsOptional()
    filter?: string
}
