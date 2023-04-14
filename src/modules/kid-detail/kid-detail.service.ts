import { BaseService, KidDetail } from "@common";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { CreateKidDetailDto } from "./dto/create-kid-detail.dto";
import { UpdateKidDetailDto } from "./dto/update-kid-detail.dto";

@Injectable()
export class KidDetailService extends BaseService {
  constructor(@InjectModel(KidDetail) private kidDetailModel: typeof KidDetail) {
    super();
  }

  find(id: number) {
    return this.kidDetailModel.findByPk(id);
  }

  async update(kidId: number, data: UpdateKidDetailDto) {
    const kidDetail = await this.kidDetailModel.findByPk(kidId);

    if (!kidDetail) throw new NotFoundException(this.i18n.t("message.NOT_FOUND", { args: { data: kidId } }));

    kidDetail.set(data);
    await kidDetail.save();

    return kidDetail;
  }

  async create(kidId: number, data: CreateKidDetailDto) {
    const kidDetail = await this.kidDetailModel.findByPk(kidId);

    if (kidDetail) throw new BadRequestException(this.i18n.t("message.KID_DETAIL_EXISTED"));

    return this.kidDetailModel.create({ ...data, id: kidId });
  }
}
