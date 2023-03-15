import { OmitType } from "@nestjs/mapped-types";
import { CreateKidByAdminDto } from "./create-kid-by-admin.dto";

export class CreateKidDto extends OmitType(CreateKidByAdminDto, ["parentId", "roleCode"] as const) {}
