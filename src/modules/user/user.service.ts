import {
  BaseService,
  generateNumber,
  MailService,
  Role,
  ROLE_ID,
  SmsService,
  User,
  UserAttributes,
  USER_STATUS,
} from "@common";
import { Injectable } from "@nestjs/common";
import { BadRequestException, NotFoundException, UnauthorizedException } from "@nestjs/common/exceptions";
import { InjectModel } from "@nestjs/sequelize";
import { OTP_TOKEN_EXPIRES } from "modules/auth/auth.constants";
import { AuthService } from "modules/auth/auth.service";
import { col, fn, Op, where, WhereOptions } from "sequelize";
import { CreateUserDto } from "./dto/create-user.dto";
import { FindUsersQueryDto } from "./dto/find-users-query.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { EXCLUDE_FIELDS } from "./user.constants";

@Injectable()
export class UserService extends BaseService {
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

  async findAll(query: FindUsersQueryDto) {
    const { includeDeleted = false, limit, offset, sort: order } = query;
    const { name } = query.filter || {};
    const rs = await this.userModel.findAndCountAll<User>({
      where: {
        ...(name && {
          nameQuery: where(fn("concat", col("firstname"), " ", col("lastname")), { [Op.like]: `%${name}%` }),
        }),
      },
      limit,
      offset,
      order,
      attributes: { exclude: EXCLUDE_FIELDS },
      include: [Role, User],
      paranoid: !includeDeleted,
    });
    return rs;
  }

  async findOne(id: number, includeDeleted = false) {
    const rs = await this.userModel.findByPk(id, {
      attributes: { exclude: EXCLUDE_FIELDS },
      include: ["parent"],
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
    const { roleId: role, apiToken } = this.request.user!;
    if (role === ROLE_ID.ADMIN) return (await user.update({ ...updateUserDto })).dataValues;

    delete others.roleId;
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

  async changePassword(id: number, newPassword: string, oldPassword?: string) {
    const existUser = await this.userModel.findByPk(id, { paranoid: false });
    if (!existUser) throw new NotFoundException(this.i18n.t("message.NOT_FOUND", { args: { data: "User" } }));
    if (existUser.status === USER_STATUS.DEACTIVED) throw new BadRequestException("message.USER_DEACTIVATED");
    if (existUser.deletedAt) throw new BadRequestException("message.USER_DELETED");

    if (!existUser.password) {
      existUser.password = await this.authService.createPassword(newPassword);
      return existUser.save();
    }
    const isPasswordMatch = await this.authService.comparePassword(oldPassword ?? "", existUser.password);
    if (!isPasswordMatch) throw new BadRequestException(this.i18n.t("message.USER_PASSWORD_INCORRECT"));
    existUser.password = await this.authService.createPassword(newPassword);
    return existUser.save();
  }
}
