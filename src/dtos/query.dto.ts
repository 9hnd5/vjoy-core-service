/* eslint-disable @typescript-eslint/no-inferrable-types */
import { Transform, Type } from "class-transformer";
import { IsArray, IsInt, IsOptional, IsPositive } from "class-validator";
export class QueryDto {
  @IsOptional()
  @Type(() => Array<[string, string]>)
  @Transform(({ value }) => {
    try {
      const parseValue = JSON.parse(value) as Array<Array<string>>;
      return parseValue.map((x) => {
        x.length = 2;
        return x;
      });
    } catch (err) {
      throw err;
    }
  })
  @IsArray({ each: true })
  sort: Array<[string, string]>;

  @IsOptional()
  @IsPositive()
  @IsInt()
  page?: number;

  @IsOptional()
  @IsPositive()
  @IsInt()
  pageSize?: number;

  get limit() {
    return this.pageSize;
  }

  get offset() {
    return this.page && this.pageSize && (this.page - 1) * this.pageSize;
  }
}
