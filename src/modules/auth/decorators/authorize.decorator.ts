import { SetMetadata } from "@nestjs/common";
import { ActionAttributes, PermissionAttributes } from "src/modules/auth/entities/role.entity";

export const AUTHORIZE_KEY = "AUTHORIZE_KEY";
export type Permission = Omit<PermissionAttributes, "action"> & {
  action: ActionAttributes;
};

export const Authorize = (permission: Permission) => SetMetadata(AUTHORIZE_KEY, permission);
