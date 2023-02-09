import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Role } from "entities/role.entity";

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role)
    private roleModel: typeof Role
  ) {}

  async findAll() {
    const rs = await this.roleModel.findAll<Role>();
    return rs;
  }

  async findOne(id: number) {
    const rs = await this.roleModel.findByPk(id);
    return rs;
  }
}
