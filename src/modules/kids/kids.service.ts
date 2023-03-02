import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Role } from "entities/role.entity";
import { CreateKidDto } from "./dto/create-kid.dto";
import { UpdateKidDto } from "./dto/update-kid.dto";
import { Kid } from "entities/kid.entity";
import { User } from "entities/user.entity";
import { QueryKidDto } from "./dto/query-kid.dto";

@Injectable()
export class KidsService {
  constructor(@InjectModel(Kid) private kidModel: typeof Kid, @InjectModel(User) private userModel: typeof User) {}

  async create(createKidDto: CreateKidDto) {
    const rs = await this.kidModel.create(createKidDto);
    return rs;
  }

  async findAll(userId?: number, query?: QueryKidDto, includeDeleted = false) {
    const rs = await this.kidModel.findAndCountAll({
      where: userId ? { parentId: userId } : {},
      limit: query?.limit,
      offset: query?.offset,
      order: query?.sort,
      include: [Role, User],
      paranoid: !includeDeleted,
    });
    return rs;
  }

  async findOne(userId: number, kidId: number, includeDeleted = false) {
    const rs = await this.kidModel.findOne({ where: { id: kidId, parentId: userId }, paranoid: !includeDeleted });
    return rs;
  }

  async update(userId: number, kidId: number, updateUserDto: UpdateKidDto) {
    const { parentId } = updateUserDto;
    if (parentId) {
      const user = await this.userModel.findByPk(parentId);
      if(!user) throw new BadRequestException("Parent is not exists");
    }
    
    await this.kidModel.update({ ...updateUserDto }, { where: { id: kidId, parentId: userId } });
    const rs = await this.kidModel.findByPk(kidId);
    return rs;
  }

  async remove(userId: number, kidId: number, hardDelete = false) {
    await this.kidModel.destroy({ where: { id: kidId, parentId: userId }, force: hardDelete }).catch(() => {
      return false;
    });
    return true;
  }
}
