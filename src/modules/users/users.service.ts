import { MailService, Role, ROLE_CODE, SmsService, User, UserAttributes, USER_STATUS } from "@common";
import { Inject, Injectable } from "@nestjs/common";
import { BadRequestException, UnauthorizedException } from "@nestjs/common/exceptions";
import { InjectModel } from "@nestjs/sequelize";
import { Request } from "express";
import { AuthService } from "modules/auth/auth.service";
import { I18nService } from "nestjs-i18n";
import { Op, WhereOptions } from "sequelize";
import { CreateUserDto } from "./dto/create-user.dto";
import { QueryUserDto } from "./dto/query-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { EXCLUDE_FIELDS } from "./users.constants";

@Injectable()
export class UsersService {
  private lang: string | undefined;
  constructor(
    @InjectModel(User) private userModel: typeof User,
    @Inject("REQUEST") private request: Request,
    private readonly authService: AuthService,
    private mailService: MailService,
    private smsService: SmsService,
    private readonly i18n: I18nService
  ) {
    this.lang = request?.headers?.["x-custom-lang"]?.toString();
  }

  async createByAdmin(createUserDto: CreateUserDto) {
    const { email, phone } = createUserDto;

    if (email) {
      const existUser = await this.checkExistUser({ email });
      if (existUser) throw new BadRequestException(await this.i18n.t("message.EMAIL_EXISTS", { lang: this.lang }));
    }
    if (phone) {
      const existUser = await this.checkExistUser({ phone });
      if (existUser) throw new BadRequestException(await this.i18n.t("message.PHONE_EXISTS", { lang: this.lang }));
    }

    const pass = createUserDto.password ?? "123456";
    const password = await this.authService.createPassword(pass);
    return await this.userModel.create({
      ...createUserDto,
      password,
      status: USER_STATUS.ACTIVATED,
    });
  }

  async findAll(query?: QueryUserDto, includeDeleted = false) {
    const rs = await this.userModel.findAndCountAll<User>({
      limit: query?.limit,
      offset: query?.offset,
      order: query?.sort,
      attributes: { exclude: EXCLUDE_FIELDS },
      include: Role,
      paranoid: !includeDeleted,
    });
    return rs;
  }

  async findOne(id: number, includeDeleted = false) {
    const rs = await this.userModel.findByPk(id, {
      attributes: { exclude: EXCLUDE_FIELDS },
      paranoid: !includeDeleted,
    });
    return rs;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    // check user exists
    const user = await this.userModel.findOne({ where: { id } });
    if (!user) throw new BadRequestException(await this.i18n.t("message.USER_NOT_EXISTS", { lang: this.lang }));

    const { email, phone, ...others } = updateUserDto;

    if (email) {
      const existUser = await this.checkExistUser({ email }, id);
      if (existUser) throw new BadRequestException(await this.i18n.t("message.EMAIL_EXISTS", { lang: this.lang }));
    }
    if (phone) {
      const existUser = await this.checkExistUser({ phone }, id);
      if (existUser) throw new BadRequestException(await this.i18n.t("message.PHONE_EXISTS", { lang: this.lang }));
    }

    // do update by admin
    const role = this.request.user?.roleCode;
    if (role === ROLE_CODE.ADMIN) return (await user.update({ ...updateUserDto })).dataValues;

    delete others.roleCode;
    user.update({ ...others });

    let otpToken: string | undefined;
    if (email && user.email) {
      const otpCode = this.authService.generateOTPCode();
      const mail = {
        to: user.email,
        subject: await this.i18n.t("email.OTP_SUBJECT", { lang: this.lang }),
        text: await this.i18n.t("email.OTP", { args: { otpCode }, lang: this.lang }),
      };
      this.mailService.send(mail);
      const payload = { userId: user.id, email };
      otpToken = await this.authService.generateOTPToken(otpCode, payload);
    }

    if (phone && user.phone) {
      const otpCode = this.authService.generateOTPCode();
      const smsContent = await this.i18n.t("sms.OTP", { args: { otpCode }, lang: this.lang });
      this.smsService.send(user.phone, smsContent);
      const payload = { userId: user.id, phone };
      otpToken = await this.authService.generateOTPToken(otpCode, payload);
    }

    return { ...user.dataValues, otpToken };
  }

  async verifyOtp(otpCode: string, otpToken: string) {
    try {
      const verifyResult = await this.authService.verifyOTPToken(otpCode, otpToken);
      const rs = await this.userModel.update(
        { email: verifyResult.email, phone: verifyResult.phone },
        { where: { id: verifyResult.userId }, returning: true }
      );
      const user = rs[1][0].get();
      return user;
    } catch {
      throw new UnauthorizedException(await this.i18n.t("message.INVALID_CREDENTIAL", { lang: this.lang }));
    }
  }

  async remove(id: number, hardDelete = false) {
    await this.userModel.destroy({ where: { id: id }, force: hardDelete }).catch(() => {
      return false;
    });
    return true;
  }

  private async checkExistUser(condition: WhereOptions<UserAttributes>, id?: number) {
    const count = await this.userModel.count({
      where: {
        [Op.not]: { id: id ?? 0 },
        ...condition,
      },
      paranoid: false,
    });
    return count > 0;
  }
}
