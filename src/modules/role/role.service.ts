import { BaseService, Role } from "@common";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";

@Injectable()
export class RoleService extends BaseService {
  constructor(
    @InjectModel(Role)
    private roleModel: typeof Role
  ) {
    super();
  }

  async findAll() {
    return this.roleModel.findAndCountAll();
  }

  async findOne(id: number) {
    return this.roleModel.findByPk(id);
  }
}
