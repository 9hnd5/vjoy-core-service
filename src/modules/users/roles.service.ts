import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Role } from "src/modules/auth/entities/role.entity";

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role)
    private roleModel: typeof Role,
  ) {}

  async findAll(includeDeleted = false) {
    const rs = await this.roleModel.findAndCountAll<Role>({ paranoid: !includeDeleted });
    return rs;
  }

  async findOne(id: number, includeDeleted = false) {
    const rs = await this.roleModel.findByPk(id, { paranoid: !includeDeleted });
    return rs;
  }
}
