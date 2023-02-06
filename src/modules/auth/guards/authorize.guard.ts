import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { InjectModel } from "@nestjs/sequelize";
import { AUTHORIZE_KEY, Permission } from "src/modules/auth/decorators/authorize.decorator";
import { SAME_USER_KEY } from "src/modules/auth/decorators/same-user.decorator";
import { Role } from "src/modules/auth/entities/role.entity";

@Injectable()
export class AuthorizeGuard implements CanActivate {
  constructor(private reflector: Reflector, @InjectModel(Role) private roleModel: typeof Role) {}
  async canActivate(context: ExecutionContext) {
    const sameUser = this.reflector.getAllAndOverride(SAME_USER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) satisfies string | undefined;

    if (sameUser) return this.isSameUser(context, sameUser);

    const permission = this.reflector.getAllAndOverride(AUTHORIZE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) satisfies Permission | undefined;
    if (!permission) return true;

    return this.isHasPermission(context, permission);
  }

  private isSameUser(context: ExecutionContext, sameUser: string) {
    const request = context.switchToHttp().getRequest();
    const userIdInToken = request.user.userId;
    const userIdInParams = request.params[sameUser];
    if (userIdInToken != userIdInParams) return false;
    return true;
  }

  private async isHasPermission(context: ExecutionContext, permission: Permission) {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const role = await this.roleModel.findOne({ where: { id: user.roleId } });
    if (!role) return false;
    if (role.code === "admin") return true;

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
