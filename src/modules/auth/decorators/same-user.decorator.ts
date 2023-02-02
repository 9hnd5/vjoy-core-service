import { SetMetadata } from "@nestjs/common";

export const SAME_USER_KEY = "SAME_USER_KEY";
export const SameUser = (field = "userId") => SetMetadata(SAME_USER_KEY, field);
