import { Injectable, NotAcceptableException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/sequelize";
import { AuthService } from "modules/auth/auth.service";
import { Role } from "entities/role.entity";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { User } from "entities/user.entity";
import { EXCLUDE_FIELDS, USER_STATUS } from "./users.constants";
import { Op } from "sequelize";
import { generateNumber } from "utils/helpers";
import { OTP_TOKEN_EXPIRES } from "utils/constants";

@Injectable()
export class UsersService {
  private secret: string;

  constructor(
    @InjectModel(User) private userModel: typeof User,

    private readonly authService: AuthService,
    private jwtService: JwtService,
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
    const { email, phone, ...othersdata } = updateUserDto;
    let otpToken: any = undefined;
    let otpCode: any = undefined;
    const or: any[] = [];
    if (email !== undefined) or.push({ email });
    if (phone !== undefined) or.push({ phone });
    if (or.length > 0) {
      const existUser = await this.userModel.findOne({ 
        where: { 
          [Op.and]: [
            { [Op.not]: [{ id: [id] }] },
            { [Op.or]: or }
          ]
        }, 
        paranoid: false });
      if (existUser) return -1;

      otpCode = generateNumber(4);
    }
    
    await this.userModel.update({ ...othersdata }, { where: { id: id } });
    const rs = await this.userModel.findByPk(id, { attributes: { exclude: EXCLUDE_FIELDS } });
    console.log(otpCode)
    if (otpCode !== undefined) {
      const payload = { userId: rs?.id, email, phone };
      otpToken = await this.jwtService.signAsync(payload, {
        secret: this.secret + otpCode,
        expiresIn: OTP_TOKEN_EXPIRES,
      });
    }

    return { ...rs?.dataValues, otpToken };
  }

  async verifyOTP(otpToken: string, otpCode: string) {
    try {
      const verifyResult = await this.jwtService.verifyAsync(otpToken, { secret: process.env.JWT_SECRET + otpCode });
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
