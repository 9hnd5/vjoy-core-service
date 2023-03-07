import { PartialType } from "@nestjs/mapped-types";
import { IsInt, IsOptional, IsPositive } from "class-validator";
import { CreateKidDto } from "./create-kid.dto";

export class UpdateKidDto extends PartialType(CreateKidDto) {
  @IsOptional()
  @IsInt()
  @IsPositive()
  parentId?: number;
}
