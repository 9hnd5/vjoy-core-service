import { BaseService, Role } from "@common";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";

@Injectable()
export class RolesService extends BaseService {
  constructor(
    @InjectModel(Role)
    private roleModel: typeof Role
  ) {
    super();
  }

  async findAll() {
    const rs = await this.roleModel.findAndCountAll<Role>();
    return rs;
  }

  async findOne(id: number) {
    const rs = await this.roleModel.findByPk(id);
    return rs;
  }

  async findOneByCode(code: string) {
    const rs = await this.roleModel.findOne({ where: { code } });
    return rs;
  }
}
