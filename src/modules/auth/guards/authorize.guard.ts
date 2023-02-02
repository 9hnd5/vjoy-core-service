import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { InjectModel } from "@nestjs/sequelize";
import { AUTHORIZE_KEY, Permission } from "src/modules/auth/decorators/authorize.decorator";
import { Role } from "src/modules/auth/entities/role.entity";

@Injectable()
export class AuthorizeGuard implements CanActivate {
  constructor(private reflector: Reflector, @InjectModel(Role) private roleModel: typeof Role) {}
  async canActivate(context: ExecutionContext) {
    const permission = this.reflector.getAllAndOverride(AUTHORIZE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) satisfies Permission | undefined;
    if (!permission) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const role = await this.roleModel.findOne({ where: { id: user.roleId } });
    return this.isAuthorized(role, permission);
  }

  private isAuthorized(role: Role | null, permission: Permission) {
    if (!role) return false;
    if (role.code === "admin") return true;

    const hasResource = role.permissions.some((p) => p.resource === "*" || p.resource === permission.resource);
    if (!hasResource) return false;

    const hasAction = role.permissions.some((p) => {
      if (p.action === "*") return true;
      if (typeof p.action === "string") return p.action === permission.action;
      return p.action.some((a) => a === permission.action);
    });
    if (!hasAction) return false;

    return true;
  }
}
