import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/sequelize";
import * as bcrypt from "bcrypt";
import { Role } from "entities/role.entity";
import { User } from "entities/user.entity";
import { SmsService } from "modules/sms/sms.service";
import { SMS_TEMPLATE } from "utils/constants";
import { USER_STATUS } from "../users/users.constants";
import { AUTH_ERROR_MESSAGE, OTP_TOKEN_EXPIRES, ROLE_CODE } from "./auth.constants";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  private expiresIn: string;
  private secret: string;
  constructor(
    configService: ConfigService,
    private jwtService: JwtService,
    private smsService: SmsService,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(Role) private roleModel: typeof Role
  ) {
    this.expiresIn = configService.get("JWT_EXPIRES") || "";
    this.secret = configService.get("JWT_SECRET") || "";
  }

  login(data: LoginDto) {
    const { type, email, password, phone } = data;
    if (type === "email") return this.loginByEmail(email, password);
    return this.loginByPhone(phone);
  }

  createPassword = (password: string) => bcrypt.hash(password, 10);

  comparePassword = (password: string, passwordHash: string) => bcrypt.compare(password, passwordHash);

  verifyOTP = async (otpToken: string, otpCode: string) => {
    try {
      const verifyResult = await this.verifyOTPToken(otpCode, otpToken);
      const existUser = (await this.userModel.findOne({
        where: { id: verifyResult.userId },
        attributes: ["id", "firstname", "lastname", "email", "password", "roleId"],
        include: Role,
      })) as User;
      existUser.status = USER_STATUS.ACTIVATED;
      await existUser.save();
      return this.generateUserToken(existUser);
    } catch {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGE.INVALID_CREDENTIAL);
    }
  };

  generateOTPToken = (otpCode: string, payload: Record<string, any>) => {
    return this.jwtService.signAsync(payload, {
      secret: this.secret + otpCode,
      expiresIn: OTP_TOKEN_EXPIRES,
    });
  };

  verifyOTPToken = (otpCode: string, otpToken: string) =>
    this.jwtService.verifyAsync(otpToken, { secret: this.secret + otpCode });

  generateOTPCode = () => `${Math.floor(Math.random() * 9000) + 1000}`; // 4 digits;

  private generateUserToken = async (user: User) => {
    const {
      id,
      firstname,
      lastname,
      email,
      roleId,
      role: { permissions, code: roleCode },
    } = user;
    const payload = { userId: id, roleId, roleCode };
    const accessToken = await this.jwtService.signAsync(payload, { secret: this.secret, expiresIn: this.expiresIn });
    return { id, firstname, lastname, email, roleId, permissions, accessToken };
  };

  private async loginByEmail(userEmail: string, userPassword: string) {
    const existUser = await this.userModel.findOne({
      where: {
        email: userEmail,
        status: USER_STATUS.ACTIVATED,
      },
      attributes: ["id", "firstname", "lastname", "email", "password", "roleId"],
      include: Role,
    });
    if (!existUser) throw new UnauthorizedException(AUTH_ERROR_MESSAGE.INVALID_CREDENTIAL);

    const isPasswordMatch = existUser.password && (await this.comparePassword(userPassword, existUser.password));
    if (!isPasswordMatch) throw new UnauthorizedException(AUTH_ERROR_MESSAGE.INVALID_CREDENTIAL);

    return this.generateUserToken(existUser);
  }

  private async loginByPhone(userPhone: string) {
    let payload = {};

    const existUser = await this.userModel.findOne({ where: { phone: userPhone }, paranoid: false });
    if (existUser) {
      if (existUser.deletedAt) throw new UnauthorizedException(AUTH_ERROR_MESSAGE.USER_DELETED);
      if (existUser.status === USER_STATUS.DEACTIVED)
        throw new UnauthorizedException(AUTH_ERROR_MESSAGE.USER_DEACTIVATED);
      payload = { userId: existUser.id, roleId: existUser.roleId };
    } else {
      const role = (await this.roleModel.findOne({ where: { code: ROLE_CODE.PARENT } })) as Role;
      const newUser = await this.userModel.create({ phone: userPhone, roleId: role.id });
      payload = { userId: newUser.id, roleId: newUser.roleId };
    }

    const otpCode = this.generateOTPCode();
    this.smsService.send(userPhone, eval("`" + SMS_TEMPLATE.OTP + "`"));
    return { otpToken: await this.generateOTPToken(otpCode, payload) };
  }
}
