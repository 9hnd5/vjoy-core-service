import { Injectable, NotAcceptableException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/sequelize";
import { AuthService } from "modules/auth/auth.service";
import { Role } from "entities/role.entity";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { User } from "entities/user.entity";
import { EXCLUDE_FIELDS, USER_STATUS } from "./users.constants";
import { transformQueries } from "utils/helpers";
import { Op } from "sequelize";
import { generateNumber } from "utils/helpers";
import { OTP_TOKEN_EXPIRES } from "utils/constants";
import { SMSService } from "modules/sms/sms.service";

@Injectable()
export class UsersService {
  private secret: string;

  constructor(
    @InjectModel(User) private userModel: typeof User,

    private readonly authService: AuthService,
    private jwtService: JwtService,
    private smsService: SMSService,
  ) {
    this.secret = process.env.JWT_SECRET || "";
  }

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
    const { email, phone, ...othersdata } = updateUserDto;
    let otpToken: any = undefined;
    let otpCode: any = undefined;
    const or: any[] = [];
    let errorCode = 0;
    if (email !== undefined) { or.push({ email }); errorCode -= 1; }
    if (phone !== undefined) { or.push({ phone }); errorCode -= 2; }
    if (or.length > 0) {
      const existUser = await this.userModel.findOne({ 
        where: { 
          [Op.and]: [
            { [Op.not]: [{ id: [id] }] },
            { [Op.or]: or }
          ]
        }, 
        paranoid: false });
      if (existUser) return errorCode;

      otpCode = this.authService.generateOTPCode();
    }
    
    await this.userModel.update({ ...othersdata }, { where: { id: id } });
    const rs = await this.userModel.findByPk(id, { attributes: { exclude: EXCLUDE_FIELDS } });
    if (otpCode !== undefined) {
      if (rs?.phone) this.smsService.send(rs.phone, `Ma OTP cua quy khach la ${otpCode}`);
      const payload = { userId: rs?.id, email, phone };
      otpToken = await this.authService.generateOTPToken(otpCode, payload);
    }

    return { ...rs?.dataValues, otpToken };
  }

  async verifyOTP(otpCode: string, otpToken: string) {
    try {
      const verifyResult = await this.authService.verifyOTPToken(otpCode, otpToken);
      const rs = await this.userModel.update({ email: verifyResult.email, phone: verifyResult.phone }, { where: { id: verifyResult.userId }, returning: true });
      return rs[1][0].get();
    } catch {
      throw new NotAcceptableException("Invalid credendial");
    }
  }

  async remove(id: number) {
    await this.userModel.destroy({ where: { id: id } }).catch(() => {
      return false;
    });
    return true;
  }
}
