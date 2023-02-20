import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Role } from "entities/role.entity";
import { CreateKidDto } from "./dto/create-kid.dto";
import { UpdateKidDto } from "./dto/update-kid.dto";
import { Kid } from "entities/kid.entity";
import { transformQueries } from "utils/helpers";

@Injectable()
export class KidsService {
  constructor(@InjectModel(Kid) private kidModel: typeof Kid) {}

  async create(createKidDto: CreateKidDto) {
    const rs = await this.kidModel.create({ ...createKidDto });
    return rs;
  }

  async findAll(userId?: number, query?, includeDeleted = false) {
    const obj: any = transformQueries(query);
    const rs = await this.kidModel.findAndCountAll<Kid>({
      where: userId ? { parentId: userId } : {},
      ...obj.pagination,
      order: obj.sort,
      include: Role,
      paranoid: !includeDeleted,
    });
    return rs;
  }

  async findOne(userId: number, kidId: number, includeDeleted = false) {
    const rs = await this.kidModel.findOne({ where: { id: kidId, parentId: userId }, paranoid: !includeDeleted });
    return rs;
  }

  async update(userId: number, kidId: number, updateUserDto: UpdateKidDto) {
    await this.kidModel.update({ ...updateUserDto }, { where: { id: kidId, parentId: userId } });
    const rs = await this.kidModel.findByPk(kidId);
    return rs;
  }

  async remove(kidId: number) {
    await this.kidModel.destroy({ where: { id: kidId } }).catch(() => {
      return false;
    });
    return true;
  }
}
