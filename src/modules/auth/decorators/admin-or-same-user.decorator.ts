import { SetMetadata } from "@nestjs/common";

export const ADMIN_OR_SAME_USER_KEY = "ADMIN_OR_SAME_USER_KEY";
export const AdminOrSameUser = (field = "userId") => SetMetadata(ADMIN_OR_SAME_USER_KEY, field);
