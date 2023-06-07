import { BaseService, KidDetail, ROLE_ID, User } from "@common";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { I18nTranslations } from "i18n/i18n.generated";
import { CreateKidDto } from "./dto/create-kid.dto";
import { UpdateKidDetailDto } from "./dto/update-kid-detail.dto";

@Injectable()
export class KidService extends BaseService<I18nTranslations> {
  constructor(
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(KidDetail) private kidDetailModel: typeof KidDetail
  ) {
    super();
  }

  async create(data: CreateKidDto) {
    const kid = await this.userModel.create({ roleId: ROLE_ID.KID_FREE, parentId: data.parentId });

    const existKidDetail = await this.kidDetailModel.findByPk(kid.id);

    if (existKidDetail)
      throw new BadRequestException(this.i18n.t("message.IS_EXISTED", { args: { data: "Kid Detail" } }));

    const kidDetail = await this.kidDetailModel.create({ ...data, kidId: kid.id });

    return { id: kid.id, parentId: kid.parentId, kidDetail };
  }

  async findKidDetail(id: number) {
    return this.kidDetailModel.findByPk(id);
  }

  async updateKidDetail(kidId: number, data: UpdateKidDetailDto) {
    const kidDetail = await this.kidDetailModel.findByPk(kidId);

    if (!kidDetail) throw new NotFoundException(this.i18n.t("message.NOT_FOUND", { args: { data: kidId } }));

    kidDetail.set(data);
    await kidDetail.save();

    return kidDetail;
  }
}
