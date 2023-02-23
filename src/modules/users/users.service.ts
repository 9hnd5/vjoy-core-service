import { Inject, Injectable } from "@nestjs/common";
import { BadRequestException, UnauthorizedException } from "@nestjs/common/exceptions";
import { InjectModel } from "@nestjs/sequelize";
import { Role } from "entities/role.entity";
import { User } from "entities/user.entity";
import { AUTH_ERROR_MESSAGE } from "modules/auth/auth.constants";
import { AuthService } from "modules/auth/auth.service";
import { SmsService } from "modules/sms/sms.service";
import { Op } from "sequelize";
import { SMS_TEMPLATE } from "utils/constants";
import { transformQueries } from "utils/helpers";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { EXCLUDE_FIELDS, USER_STATUS } from "./users.constants";

@Injectable()
export class UsersService {
  private secret: string;

  constructor(
    @InjectModel(User) private userModel: typeof User,

    @Inject("REQUEST") private request: any,
    private readonly authService: AuthService,
    private smsService: SmsService
  ) {}

  async createByAdmin(createUserDto: CreateUserDto) {
    const pass = createUserDto.password??"123456";
    const password = await this.authService.createPassword(pass);
    const rs = await this.userModel.create({
      ...createUserDto,
      password,
      status: USER_STATUS.ACTIVATED,
    });
    const { password: pw, ...user } = rs.dataValues;
    return user;
  }

  async findAll(query?, includeDeleted = false) {
    const obj: any = transformQueries(query);
    const rs = await this.userModel.findAndCountAll<User>({
      ...obj.pagination,
      order: obj.sort,
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
    try {
      const role = this.request.user?.roleCode;

      if (role === "admin") {
        const rs = await this.userModel.update(updateUserDto, { where: { id: id }, returning: true });
        const { password: pw, ...user } = rs[1][0].get();
        return user;
      }

      const { email, phone, ...others } = updateUserDto;
      const rs = await this.userModel.update(others, { where: { id: id }, returning: true });
      let otpToken;
      const user = rs[1][0].get();
      if (email) {
        const existUser = await this.checkExistUser(user.id, { email });
        if (existUser) throw new BadRequestException("Email already exists");

        const otpCode = this.authService.generateOTPCode();
        // send email
        const payload = { userId: user.id, email };
        otpToken = this.authService.generateOTPToken(otpCode, payload);
      }
      if (phone) {
        const existUser = await this.checkExistUser(user.id, { phone });
        if (existUser) throw new BadRequestException("Phone already exists");

        const otpCode = this.authService.generateOTPCode();
        if (user.phone) this.smsService.send(user.phone, eval("`" + SMS_TEMPLATE.OTP + "`"));
        const payload = { userId: user.id, phone };
        otpToken = this.authService.generateOTPToken(otpCode, payload);
      }
      return { ...user, otpToken };
    } catch {
      throw new BadRequestException("There was an error when updating");
    }
  }

  async verifyOtp(otpCode: string, otpToken: string) {
    try {
      const verifyResult = await this.authService.verifyOTPToken(otpCode, otpToken);
      const rs = await this.userModel.update(
        { email: verifyResult.email, phone: verifyResult.phone },
        { where: { id: verifyResult.userId }, returning: true }
      );
      return rs[1][0].get();
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

  private async checkExistUser(id, condition) {
    return await this.userModel.findOne({
      where: {
        [Op.not]: id,
        ...condition,
      },
      paranoid: false,
    });
  }
}
