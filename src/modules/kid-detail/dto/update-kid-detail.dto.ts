import { PartialType } from "@nestjs/mapped-types";
import { CreateKidDetailDto } from "./create-kid-detail.dto";

export class UpdateKidDetailDto extends PartialType(CreateKidDetailDto) {}
