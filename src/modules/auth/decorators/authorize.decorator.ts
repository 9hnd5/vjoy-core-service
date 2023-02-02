import { SetMetadata } from "@nestjs/common";
import { PermissionAttributes } from "src/modules/auth/entities/role.entity";

export const AUTHORIZE_KEY = "AUTHORIZE_KEY";
export type Permission = PermissionAttributes;

export const Authorize = (permission: Permission) => SetMetadata(AUTHORIZE_KEY, permission);
