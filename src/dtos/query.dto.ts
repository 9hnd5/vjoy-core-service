/* eslint-disable @typescript-eslint/no-inferrable-types */
import { Transform, Type } from "class-transformer";
import { IsArray, IsNumber, IsOptional } from "class-validator";
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
  sort: Array<Array<[string, string]>>[];

  @IsOptional()
  @IsNumber()
  page: number = 1;
  @IsOptional()
  @IsNumber()
  pageSize: number = 10;

  get limit() {
    return this.pageSize;
  }

  get offset() {
    return (this.page - 1) * this.pageSize;
  }
}
