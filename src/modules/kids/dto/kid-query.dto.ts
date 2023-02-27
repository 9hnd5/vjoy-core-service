import { IsJSON, IsNotEmpty, IsNumberString, IsOptional } from "class-validator";

class Test {
  @IsNotEmpty()
  first: string;
}
export class KidQueryDto {
  @IsNumberString()
  @IsOptional()
  page?: number;

  @IsNumberString()
  @IsOptional()
  pageSize?: number;

  @IsOptional()
  @IsJSON()
  sort?: string;
}
