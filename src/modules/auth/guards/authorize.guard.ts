import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { InjectModel } from "@nestjs/sequelize";
import { ROLE_CODE } from "../auth.constants";
import { ADMIN_OR_SAME_USER_KEY } from "../decorators/admin-or-same-user.decorator";
import { AUTHORIZE_KEY, Permission } from "../decorators/authorize.decorator";
import { Role } from "entities/role.entity";

@Injectable()
export class AuthorizeGuard implements CanActivate {
  constructor(private reflector: Reflector, @InjectModel(Role) private roleModel: typeof Role) {}
  async canActivate(context: ExecutionContext) {
    const adminOrSameUser = this.reflector.getAllAndOverride(ADMIN_OR_SAME_USER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) satisfies string | undefined;

    if (adminOrSameUser) return this.isAdminOrSameUser(context, adminOrSameUser);

    const permission = this.reflector.getAllAndOverride(AUTHORIZE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) satisfies Permission | undefined;
    if (!permission) return true;

    return this.isHasPermission(context, permission);
  }

  private async isAdminOrSameUser(context: ExecutionContext, adminOrSameUser: string) {
    const request = context.switchToHttp().getRequest();
    const roleCodeInToken = request.user.roleCode;
    if (roleCodeInToken === ROLE_CODE.ADMIN) return true;

    const userIdInToken = request.user.userId;
    const userIdInParams = request.params[adminOrSameUser];
    if (userIdInToken != userIdInParams) return false;
    return true;
  }

  private async isHasPermission(context: ExecutionContext, permission: Permission) {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const role = await this.roleModel.findOne({ where: { id: user.roleId } });
    if (!role) return false;
    if (role.code === ROLE_CODE.ADMIN) return true;

    const hasResource = role.permissions?.some((p) => p.resource === "*" || p.resource === permission.resource);
    if (!hasResource) return false;

    const hasAction = role.permissions?.some((p) => {
      if (p.action === "*") return true;
      if (typeof p.action === "string") return p.action === permission.action;
      return p.action.some((a) => a === permission.action);
    });
    if (!hasAction) return false;

    return true;
  }
}
