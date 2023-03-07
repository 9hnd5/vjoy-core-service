import { Inject, Injectable } from "@nestjs/common";
import { BadRequestException, UnauthorizedException } from "@nestjs/common/exceptions";
import { InjectModel } from "@nestjs/sequelize";
import { Role } from "entities/role.entity";
import { User, UserAttributes } from "entities/user.entity";
import { AUTH_ERROR_MESSAGE, ROLE_CODE } from "modules/auth/auth.constants";
import { AuthService } from "modules/auth/auth.service";
import { MailService } from "modules/mail/mail.service";
import { SmsService } from "modules/sms/sms.service";
import { Op, WhereOptions } from "sequelize";
import { SMS_TEMPLATE } from "utils/constants";
import { CreateUserDto } from "./dto/create-user.dto";
import { QueryUserDto } from "./dto/query-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { EXCLUDE_FIELDS, USER_ERROR_MESSAGE, USER_STATUS } from "./users.constants";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User) private userModel: typeof User,

    @Inject("REQUEST") private request: any,
    private readonly authService: AuthService,
    private mailService: MailService,
    private smsService: SmsService
  ) {}

  async createByAdmin(createUserDto: CreateUserDto) {
    const { email, phone } = createUserDto;

    if (email) {
      const existUser = await this.checkExistUser({ email });
      if (existUser) throw new BadRequestException(USER_ERROR_MESSAGE.EMAIL_EXISTS);
    }
    if (phone) {
      const existUser = await this.checkExistUser({ phone });
      if (existUser) throw new BadRequestException(USER_ERROR_MESSAGE.PHONE_EXISTS);
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
    if (!user) throw new BadRequestException("User does not exists");

    const { email, phone, ...others } = updateUserDto;

    if (email) {
      const existUser = await this.checkExistUser({ email }, id);
      if (existUser) throw new BadRequestException(USER_ERROR_MESSAGE.EMAIL_EXISTS);
    }
    if (phone) {
      const existUser = await this.checkExistUser({ phone }, id);
      if (existUser) throw new BadRequestException(USER_ERROR_MESSAGE.PHONE_EXISTS);
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
        subject: "OTP update email",
        text: eval("`" + SMS_TEMPLATE.OTP + "`"),
      };
      this.mailService.send(mail);
      const payload = { userId: user.id, email };
      otpToken = await this.authService.generateOTPToken(otpCode, payload);
    }

    if (phone && user.phone) {
      const otpCode = this.authService.generateOTPCode();
      this.smsService.send(user.phone, eval("`" + SMS_TEMPLATE.OTP + "`"));
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
      throw new UnauthorizedException(AUTH_ERROR_MESSAGE.INVALID_CREDENTIAL);
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
