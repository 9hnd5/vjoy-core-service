import { BaseService } from "@common";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Config } from "@common";
import { Op } from "sequelize";
import { CreateConfigDto } from "./dto/create-config.dto";
import { FindConfigsQueryDto } from "./dto/find-configs-query.dto";
import { UpdateConfigDto } from "./dto/update-config.dto";

@Injectable()
export class ConfigService extends BaseService {
  constructor(@InjectModel(Config) private configModel: typeof Config) {
    super();
  }

  create(createConfigDto: CreateConfigDto) {
    return this.configModel.create(createConfigDto);
  }

  findAll(query: FindConfigsQueryDto, includeDeleted = false) {
    const { limit, offset, sort: order } = query;
    const { type } = query.filter || {};
    return this.configModel.findAndCountAll({
      ...(type && { where: { type: { [Op.like]: `%${type}%` } } }),
      limit,
      offset,
      order,
      paranoid: !includeDeleted,
    });
  }

  async findOne(id: number, includeDeleted = false) {
    const config = await this.configModel.findByPk(id, {
      paranoid: !includeDeleted,
    });
    if (!config) throw new NotFoundException(this.i18n.t("message.NOT_FOUND", { args: { data: id } }));

    return config;
  }

  async update(id: number, updateConfigDto: UpdateConfigDto) {
    const config = await this.configModel.findByPk(id);
    if (!config) throw new NotFoundException(this.i18n.t("message.NOT_FOUND", { args: { data: id } }));

    config.set(updateConfigDto);
    return config.save();
  }

  async remove(id: number, hardDelete = false) {
    const config = await this.configModel.findByPk(id, { paranoid: false });
    if (!config) throw new NotFoundException(this.i18n.t("message.NOT_FOUND", { args: { data: id } }));

    return config.destroy({ force: hardDelete });
  }
}
