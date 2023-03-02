import { ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { HEADER_KEY } from "utils/constants";
import { ADMIN_OR_SAME_USER_KEY } from "../decorators/admin-or-same-user.decorator";
import { AUTHORIZE_KEY, Permission } from "../decorators/authorize.decorator";

@Injectable()
export class AuthenticateGuard extends AuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super();
  }
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const apiToken = request.headers[HEADER_KEY.API_TOKEN];
    if (!apiToken) throw new UnauthorizedException();

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
