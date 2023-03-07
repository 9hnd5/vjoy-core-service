import { BadRequestException, Inject, Injectable, NotFoundException, Scope } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { InjectModel } from "@nestjs/sequelize";
import { Kid } from "entities/kid.entity";
import { Role } from "entities/role.entity";
import { User } from "entities/user.entity";
import { Request } from "express";
import { ROLE_CODE } from "modules/auth/auth.constants";
import { CreateKidDto } from "./dto/create-kid.dto";
import { QueryKidDto } from "./dto/query-kid.dto";
import { I18nService } from "nestjs-i18n";
import { UpdateKidDto } from "./dto/update-kid.dto";

@Injectable({ scope: Scope.REQUEST })
export class KidsService {
  constructor(
    @InjectModel(Kid) private kidModel: typeof Kid,
    @InjectModel(User) private userModel: typeof User,
    private readonly i18n: I18nService
    @Inject(REQUEST) private request: Request
  ) {}

  async create(createKidDto: CreateKidDto, parentId: number) {
    const parent = await this.userModel.findByPk(parentId);
    if (!parent) throw new BadRequestException("Parent Not Found");

    const signinUser = this.request.user!;
    if (signinUser.roleCode !== ROLE_CODE.ADMIN) createKidDto.roleCode = ROLE_CODE.KID_FREE;

    return this.kidModel.create({ ...createKidDto, parentId });
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

  async findOne(parentId: number, kidId: number, includeDeleted = false) {
    const kid = await this.kidModel.findOne({
      where: { id: kidId, parentId },
      include: [
        { model: Role, attributes: ["id", "name", "code"] },
        { model: User, attributes: ["id", "firstname", "lastname"] },
      ],
      paranoid: !includeDeleted,
      attributes: ["id", "firstname", "lastname", "gender", "dob", "updatedAt"],
    });
    if (!kid) throw new NotFoundException("Kid Not Found");

    return kid;
  }

  async update(parentId: number, kidId: number, updateUserDto: UpdateKidDto) {
    const { roleCode, parentId: newParentId } = updateUserDto;

    const kid = await this.kidModel.findOne({ where: { id: kidId, parentId } });
    if (!kid) throw new NotFoundException("Kid Not Found");

    const signinUser = this.request.user!;
    if (signinUser.roleCode !== ROLE_CODE.ADMIN && (roleCode || newParentId))
      throw new BadRequestException("Not Enough Permission");

    kid.set(updateUserDto);
    return kid.save();
  }

  async remove(parentId: number, kidId: number, hardDelete = false) {
    const kid = await this.kidModel.findOne({ where: { id: kidId, parentId }, paranoid: false });
    if (!kid) throw new NotFoundException("Kid Not Found");

    const signinUser = this.request.user!;
    if (signinUser.roleCode !== ROLE_CODE.ADMIN && hardDelete) throw new BadRequestException("Not Enough Permission");

    return kid.destroy({ force: hardDelete });
  }
}
