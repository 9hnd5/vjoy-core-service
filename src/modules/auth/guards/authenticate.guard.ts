import { ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { AUTHORIZE_KEY, Permission } from "src/modules/auth/decorators/authorize.decorator";
import { ADMIN_OR_SAME_USER_KEY } from "src/modules/auth/decorators/admin-or-same-user.decorator";

@Injectable()
export class AuthenticateGuard extends AuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super();
  }
  canActivate(context: ExecutionContext) {
    const permission = this.reflector.getAllAndOverride(AUTHORIZE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) satisfies Permission | undefined;
    const adminOrSameUser = this.reflector.getAllAndOverride(ADMIN_OR_SAME_USER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) satisfies string | undefined;
    if (!permission && !adminOrSameUser) return true;

    return super.canActivate(context);
  }
}
