import {
  BaseService,
  generateNumber,
  MailService,
  Role,
  ROLE_CODE,
  SmsService,
  User,
  UserAttributes,
  USER_STATUS
} from "@common";
import { Injectable } from "@nestjs/common";
import { BadRequestException, NotFoundException, UnauthorizedException } from "@nestjs/common/exceptions";
import { InjectModel } from "@nestjs/sequelize";
import { OTP_TOKEN_EXPIRES } from "modules/auth/auth.constants";
import { AuthService } from "modules/auth/auth.service";
import { Op, WhereOptions } from "sequelize";
import { CreateUserDto } from "./dto/create-user.dto";
import { QueryUserDto } from "./dto/query-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { EXCLUDE_FIELDS } from "./users.constants";

@Injectable()
export class UsersService extends BaseService {
  constructor(
    @InjectModel(User) private userModel: typeof User,
    private readonly authService: AuthService,
    private mailService: MailService,
    private smsService: SmsService
  ) {
    super();
  }

  async createByAdmin(createUserDto: CreateUserDto) {
    const { email, phone, firstname, lastname } = createUserDto;

    if (email) {
      const existUser = await this.checkExistUser({ email });
      if (existUser) throw new BadRequestException(this.i18n.t("message.EMAIL_EXISTS"));
    }
    if (phone) {
      const existUser = await this.checkExistUser({ phone });
      if (existUser) throw new BadRequestException(this.i18n.t("message.PHONE_EXISTS"));
    }

    const pass = createUserDto.password ?? generateNumber(6).toString();
    const password = await this.authService.createPassword(pass);

    if (this.request.user?.apiToken.type != "vjoy-test") {
      const mail = {
        to: email,
        subject: this.i18n.t("email.NEW_ACCOUNT_SUBJECT"),
        html: this.i18n.t("email.NEW_ACCOUNT_BODY", { args: { fullname: `${firstname} ${lastname}`, pass } }),
      };
      this.mailService.sendHtml(mail);
    }

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
    if (!user) throw new NotFoundException(this.i18n.t("message.NOT_FOUND", { args: { data: id } }));

    const { email, phone, ...others } = updateUserDto;

    if (email) {
      const existUser = await this.checkExistUser({ email }, id);
      if (existUser) throw new BadRequestException(this.i18n.t("message.EMAIL_EXISTS"));
    }
    if (phone) {
      const existUser = await this.checkExistUser({ phone }, id);
      if (existUser) throw new BadRequestException(this.i18n.t("message.PHONE_EXISTS"));
    }

    // do update by admin
    const { roleCode: role, apiToken } = this.request.user!;
    if (role === ROLE_CODE.ADMIN) return (await user.update({ ...updateUserDto })).dataValues;

    delete others.roleCode;
    user.update({ ...others });

    let otpToken: string | undefined;
    if (email && user.email) {
      const otpCode = this.authService.generateOTPCode();

      if (apiToken.type != "vjoy-test") {
        const mail = {
          to: user.email,
          subject: this.i18n.t("email.OTP_SUBJECT"),
          text: this.i18n.t("email.OTP_BODY", { args: { otpCode, min: OTP_TOKEN_EXPIRES.replace("m", "") } }),
        };
        this.mailService.send(mail);
      }
      const payload = { userId: user.id, email };
      otpToken = await this.authService.generateOTPToken(otpCode, payload);
    }

    if (phone && user.phone) {
      const otpCode = this.authService.generateOTPCode();

      if (apiToken.type != "vjoy-test") {
        const smsContent = this.i18n.t("sms.OTP", { args: { otpCode, min: OTP_TOKEN_EXPIRES.replace("m", "") } });
        this.smsService.send(user.phone, smsContent);
      }
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
      throw new UnauthorizedException(this.i18n.t("message.INVALID_CREDENTIAL"));
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
