import { InjectCoreModel, Kid, Role, User } from "@common";
import { BadRequestException, Inject, Injectable, NotFoundException, Scope } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { Request } from "express";
import { ROLE_CODE } from "@common";
import { I18nService } from "nestjs-i18n";
import { CreateKidDto } from "./dto/create-kid.dto";
import { QueryKidDto } from "./dto/query-kid.dto";
import { UpdateKidDto } from "./dto/update-kid.dto";

@Injectable({ scope: Scope.REQUEST })
export class KidsService {
  private lang: string | undefined;
  constructor(
    @InjectCoreModel(Kid) private kidModel: typeof Kid,
    @InjectCoreModel(User) private userModel: typeof User,
    @Inject(REQUEST) private request: Request,
    private readonly i18n: I18nService
  ) {
    this.lang = request?.headers?.["x-custom-lang"]?.toString();
  }

  async create(createKidDto: CreateKidDto, parentId: number) {
    const parent = await this.userModel.findByPk(parentId);
    if (!parent)
      throw new BadRequestException(
        await this.i18n.t("message.NOT_FOUND", { args: { data: parentId }, lang: this.lang })
      );

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
    if (!kid)
      throw new NotFoundException(await this.i18n.t("message.NOT_FOUND", { args: { data: kidId }, lang: this.lang }));

    return kid;
  }

  async update(parentId: number, kidId: number, updateUserDto: UpdateKidDto) {
    const { roleCode, parentId: newParentId } = updateUserDto;

    const kid = await this.kidModel.findOne({ where: { id: kidId, parentId } });
    if (!kid)
      throw new NotFoundException(await this.i18n.t("message.NOT_FOUND", { args: { data: kidId }, lang: this.lang }));

    const signinUser = this.request.user!;
    if (signinUser.roleCode !== ROLE_CODE.ADMIN && (roleCode || newParentId))
      throw new BadRequestException(await this.i18n.t("message.NOT_PERMISSION", { lang: this.lang }));

    kid.set(updateUserDto);
    return kid.save();
  }

  async remove(parentId: number, kidId: number, hardDelete = false) {
    const kid = await this.kidModel.findOne({ where: { id: kidId, parentId }, paranoid: false });
    if (!kid) throw new NotFoundException("Kid Not Found");

    const signinUser = this.request.user!;
    if (signinUser.roleCode !== ROLE_CODE.ADMIN && hardDelete)
      throw new BadRequestException(await this.i18n.t("message.NOT_PERMISSION", { lang: this.lang }));

    return kid.destroy({ force: hardDelete });
  }
}
