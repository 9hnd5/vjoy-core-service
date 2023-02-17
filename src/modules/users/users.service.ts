import { Injectable, Inject } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { AuthService } from "modules/auth/auth.service";
import { Role } from "entities/role.entity";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { User } from "entities/user.entity";
import { EXCLUDE_FIELDS, USER_STATUS } from "./users.constants";
import { Op } from "sequelize";
import { generateNumber } from "utils/helpers";
import { SmsService } from "modules/sms/sms.service";
import { BadRequestException, UnauthorizedException } from "@nestjs/common/exceptions";
import { AUTH_ERROR_MESSAGE } from "modules/auth/auth.constants";
import { SMS_TEMPLATE } from "utils/constants";

@Injectable()
export class UsersService {

  constructor(
    @InjectModel(User) private userModel: typeof User,

    @Inject("REQUEST") private request: any,
    private readonly authService: AuthService,
    private smsService: SmsService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const pass = await this.authService.createPassword(`${generateNumber(6)}`);
    const rs = await this.userModel.create({
      ...createUserDto,
      password: pass,
      status: USER_STATUS.ACTIVATED,
    });
    return rs;
  }

  async findAll(query?, includeDeleted = false) {
    const rs = await this.userModel.findAndCountAll<User>({
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
    const role = this.request.user?.roleCode;
    const { email, phone, ...othersdata } = updateUserDto;
    
    await this.userModel.update(role !== "admin" ? othersdata : updateUserDto, { where: { id: id } });
    const rs = await this.userModel.findByPk(id, { attributes: { exclude: EXCLUDE_FIELDS } });

    if (role !== "admin" && rs) {
      const otpToken = await this.updateEmailPhone(rs, email, phone);
      return { ...rs?.dataValues, otpToken };
    }

    return rs?.dataValues;
  }

  async verifyOTP(otpCode: string, otpToken: string) {
    try {
      const verifyResult = await this.authService.verifyOTPToken(otpCode, otpToken);
      const rs = await this.userModel.update({ email: verifyResult.email, phone: verifyResult.phone }, { where: { id: verifyResult.userId }, returning: true });
      return rs[1][0].get();
    } catch {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGE.INVALID_CREDENTIAL);
    }
  }

  async remove(id: number) {
    await this.userModel.destroy({ where: { id: id } }).catch(() => {
      return false;
    });
    return true;
  }

  private async updateEmailPhone(user: User, email?: string, phone?: string) {
    if(email) {
      const existUser = await this.userModel.findOne({ 
        where: { 
          [Op.not]: [{ id: [user.id] }],
          email
        }, 
        paranoid: false });
      if (existUser) throw new BadRequestException("Email already exists");

      const otpCode = this.authService.generateOTPCode();
      console.log(otpCode);
      const payload = { userId: user.id, email };
      return this.authService.generateOTPToken(otpCode, payload);
    }
    if(phone) {
      const existUser = await this.userModel.findOne({ 
        where: { 
          [Op.not]: [{ id: [user.id] }],
          phone
        }, 
        paranoid: false });
      if (existUser) throw new BadRequestException("Phone already exists");

      const otpCode = this.authService.generateOTPCode();
      if(user.phone) this.smsService.send(user.phone, eval("`" + SMS_TEMPLATE.OTP + "`"));
      const payload = { userId: user.id, phone };
      return this.authService.generateOTPToken(otpCode, payload);
    }
  }
}
