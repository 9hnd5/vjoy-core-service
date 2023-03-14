import { ApiKey, BaseService, Role, ROLE_CODE, SmsService, User, USER_STATUS } from "@common";
import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/sequelize";
import * as bcrypt from "bcrypt";
import { OTP_TOKEN_EXPIRES } from "./auth.constants";
import { CreateApiKeyDto } from "./dto/create-api-key.dto";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService extends BaseService {
  private expiresIn: string;
  private secret: string;
  private atSecret: string;
  constructor(
    configService: ConfigService,
    private jwtService: JwtService,
    private smsService: SmsService,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(ApiKey) private apiKeyModel: typeof ApiKey
  ) {
    super();
    this.expiresIn = configService.get("JWT_EXPIRES") || "";
    this.secret = configService.get("JWT_SECRET") || "";
    this.atSecret = configService.get("JWT_API_TOKEN_SECRET") || "";
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
        attributes: ["id", "firstname", "lastname", "email", "password", "roleCode"],
        include: Role,
      })) as User;
      existUser.status = USER_STATUS.ACTIVATED;
      await existUser.save();
      return this.generateUserToken(existUser);
    } catch {
      throw new UnauthorizedException(this.i18n.t("message.INVALID_CREDENTIAL"));
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

  createApiKey = async (data: CreateApiKeyDto) => {
    const { type, name, description } = data;
    const env = process.env.ENV!;
    const payload = { name, type, env };
    const apiToken = await this.jwtService.signAsync(payload, { secret: this.atSecret });
    const newApiKey = await this.apiKeyModel.create({
      apiToken,
      env,
      type,
      name,
      description,
    });
    return newApiKey.dataValues;
  };

  deleteApiKey = async (id: number) => {
    const existApiKey = await this.apiKeyModel.findOne({ where: { id } });
    if (!existApiKey) throw new NotFoundException();
    return this.apiKeyModel.destroy({ where: { id } });
  };

  private generateUserToken = async (user: User) => {
    const {
      id,
      firstname,
      lastname,
      email,
      roleCode,
      role: { permissions },
    } = user;
    const payload = { userId: id, roleCode };
    const accessToken = await this.jwtService.signAsync(payload, { secret: this.secret, expiresIn: this.expiresIn });
    return { id, firstname, lastname, email, roleCode, permissions, accessToken };
  };

  private async loginByEmail(userEmail: string, userPassword: string) {
    const existUser = await this.userModel.findOne({
      where: {
        email: userEmail,
        status: USER_STATUS.ACTIVATED,
      },
      attributes: ["id", "firstname", "lastname", "email", "password", "roleCode"],
      include: Role,
    });
    if (!existUser) throw new UnauthorizedException(this.i18n.t("message.INVALID_CREDENTIAL"));

    const isPasswordMatch = existUser.password && (await this.comparePassword(userPassword, existUser.password));
    if (!isPasswordMatch) throw new UnauthorizedException(this.i18n.t("message.INVALID_CREDENTIAL"));

    return this.generateUserToken(existUser);
  }

  private async loginByPhone(userPhone: string) {
    let payload = {};

    const existUser = await this.userModel.findOne({ where: { phone: userPhone }, paranoid: false });
    if (existUser) {
      if (existUser.deletedAt) throw new UnauthorizedException(this.i18n.t("message.USER_DELETED"));
      if (existUser.status === USER_STATUS.DEACTIVED)
        throw new UnauthorizedException(this.i18n.t("message.USER_DEACTIVATED"));
      payload = { userId: existUser.id, roleCode: existUser.roleCode };
    } else {
      const newUser = await this.userModel.create({ phone: userPhone, roleCode: ROLE_CODE.PARENT });
      payload = { userId: newUser.id, roleCode: newUser.roleCode };
    }

    const otpCode = this.generateOTPCode();
    console.log("type", this.request.user)
    if (this.request.user?.apiToken.type != "vjoy-test") {
      const smsContent = this.i18n.t("sms.OTP", { args: { otpCode, min: OTP_TOKEN_EXPIRES.replace("m", "") } });
      this.smsService.send(userPhone, smsContent as string);
    }

    return { otpToken: await this.generateOTPToken(otpCode, payload) };
  }
}
