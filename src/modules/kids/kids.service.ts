import { BaseService, Kid, Role, ROLE_CODE, User } from "@common";
import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { CreateKidByAdminDto } from "./dto/create-kid-by-admin.dto";
import { CreateKidDto } from "./dto/create-kid.dto";
import { QueryKidDto } from "./dto/query-kid.dto";
import { UpdateKidByAdminDto } from "./dto/update-kid-by-admin.dto";
import { UpdateKidDto } from "./dto/update-kid.dto";

@Injectable()
export class KidsService extends BaseService {
  constructor(@InjectModel(Kid) private kidModel: typeof Kid, @InjectModel(User) private userModel: typeof User) {
    super();
  }

  async createByUser(createKidDto: CreateKidDto, parentId: number) {
    const count = await this.userModel.count({ where: { id: parentId } });
    if (count <= 0) throw new NotFoundException(this.i18n.t("message.NOT_FOUND", { args: { data: parentId } }));

    return this.kidModel.create({ ...createKidDto, parentId, roleCode: ROLE_CODE.KID_FREE });
  }

  findAll(query: QueryKidDto, parentId?: number) {
    const { includeDeleted = false, limit, offset, sort: order } = query;
    return this.kidModel.findAndCountAll({
      ...(parentId && { where: { parentId } }),
      limit,
      offset,
      order,
      include: [
        { model: Role, attributes: ["id", "name", "code"] },
        { model: User, attributes: ["id", "firstname", "lastname"] },
      ],
      paranoid: !includeDeleted,
      attributes: ["id", "firstname", "lastname", "gender", "dob", "updatedAt"],
    });
  }

  async findOneByUser(parentId: number, kidId: number, includeDeleted = false) {
    const kid = await this.kidModel.findOne({
      where: { id: kidId, parentId },
      include: [
        { model: Role, attributes: ["id", "name", "code"] },
        { model: User, attributes: ["id", "firstname", "lastname"] },
      ],
      paranoid: !includeDeleted,
      attributes: ["id", "firstname", "lastname", "gender", "dob", "updatedAt"],
    });
    if (!kid) throw new NotFoundException(this.i18n.t("message.NOT_FOUND", { args: { data: kidId } }));

    return kid;
  }

  async updateByUser(parentId: number, kidId: number, updateUserDto: UpdateKidDto) {
    const kid = await this.kidModel.findOne({ where: { id: kidId, parentId } });
    if (!kid) throw new NotFoundException(this.i18n.t("message.NOT_FOUND", { args: { data: kidId } }));

    kid.set(updateUserDto);
    return kid.save();
  }

  async removeByUser(parentId: number, kidId: number, hardDelete = false) {
    const kid = await this.kidModel.findOne({ where: { id: kidId, parentId }, paranoid: false });
    if (!kid) throw new NotFoundException(this.i18n.t("message.NOT_FOUND", { args: { data: kidId } }));

    const signinUser = this.request.user!;
    if (signinUser.roleCode !== ROLE_CODE.ADMIN && hardDelete)
      throw new UnauthorizedException(this.i18n.t("message.NOT_PERMISSION"));

    return kid.destroy({ force: hardDelete });
  }

  async createByAdmin(createKidDto: CreateKidByAdminDto) {
    const { parentId } = createKidDto;
    const count = await this.userModel.count({ where: { id: parentId } });
    if (count <= 0) throw new NotFoundException(this.i18n.t("message.NOT_FOUND", { args: { data: parentId } }));

    return this.kidModel.create(createKidDto);
  }

  async findOneByAdmin(kidId: number, includeDeleted = false) {
    const kid = await this.kidModel.findOne({
      where: { id: kidId },
      include: [
        { model: Role, attributes: ["id", "name", "code"] },
        { model: User, attributes: ["id", "firstname", "lastname"] },
      ],
      paranoid: !includeDeleted,
      attributes: ["id", "firstname", "lastname", "gender", "dob", "updatedAt"],
    });
    if (!kid) throw new NotFoundException(this.i18n.t("message.NOT_FOUND", { args: { data: kidId } }));

    return kid;
  }

  async updateByAdmin(kidId: number, updateUserDto: UpdateKidByAdminDto) {
    const kid = await this.kidModel.findOne({ where: { id: kidId } });
    if (!kid) throw new NotFoundException(this.i18n.t("message.NOT_FOUND", { args: { data: kidId } }));

    const { parentId } = updateUserDto;
    if (parentId) {
      const count = await this.userModel.count({ where: { id: parentId } });
      if (count <= 0) throw new NotFoundException(this.i18n.t("message.NOT_FOUND", { args: { data: parentId } }));
    }

    kid.set(updateUserDto);
    return kid.save();
  }

  async removeByAdmin(kidId: number, hardDelete = false) {
    const kid = await this.kidModel.findOne({ where: { id: kidId }, paranoid: false });
    if (!kid) throw new NotFoundException(this.i18n.t("message.NOT_FOUND", { args: { data: kidId } }));

    return kid.destroy({ force: hardDelete });
  }
}
