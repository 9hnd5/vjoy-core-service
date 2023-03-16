import { PartialType } from "@nestjs/mapped-types";
import { CreateKidByAdminDto } from "./create-kid-by-admin.dto";

export class UpdateKidByAdminDto extends PartialType(CreateKidByAdminDto) {}
