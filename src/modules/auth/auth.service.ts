import { Inject, Injectable, NotFoundException, Scope, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { REQUEST } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/sequelize";
import * as bcrypt from "bcrypt";
import { ApiKey } from "entities/api-key.entity";
import { Role } from "entities/role.entity";
import { User } from "entities/user.entity";
import { Request } from "express";
import { SmsService } from "modules/sms/sms.service";
import { USER_STATUS } from "../users/users.constants";
import { OTP_TOKEN_EXPIRES, ROLE_CODE } from "./auth.constants";
import { CreateApiKeyDto } from "./dto/create-api-key.dto";
import { LoginDto } from "./dto/login.dto";
import { I18nService } from "nestjs-i18n";

@Injectable({ scope: Scope.REQUEST })
export class AuthService {
  private expiresIn: string;
  private secret: string;
  private atSecret: string;
  private lang: string | undefined;
  constructor(
    configService: ConfigService,
    private jwtService: JwtService,
    private smsService: SmsService,
    private readonly i18n: I18nService,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(Role) private roleModel: typeof Role,
    @InjectModel(ApiKey) private apiKeyModel: typeof ApiKey,
    @Inject(REQUEST) private request: Request,
  ) {
    this.expiresIn = configService.get("JWT_EXPIRES") || "";
    this.secret = configService.get("JWT_SECRET") || "";
    this.atSecret = configService.get("JWT_API_TOKEN_SECRET") || "";
    this.lang = request?.headers?.["x-custom-lang"]?.toString();
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
      throw new UnauthorizedException(await this.i18n.t("message.INVALID_CREDENTIAL", { lang: this.lang }));
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
    if (!existUser)
      throw new UnauthorizedException(await this.i18n.t("message.INVALID_CREDENTIAL", { lang: this.lang }));

    const isPasswordMatch = existUser.password && (await this.comparePassword(userPassword, existUser.password));
    if (!isPasswordMatch)
      throw new UnauthorizedException(await this.i18n.t("message.INVALID_CREDENTIAL", { lang: this.lang }));

    return this.generateUserToken(existUser);
  }

  private async loginByPhone(userPhone: string) {
    let payload = {};

    const existUser = await this.userModel.findOne({ where: { phone: userPhone }, paranoid: false });
    if (existUser) {
      if (existUser.deletedAt)
        throw new UnauthorizedException(await this.i18n.t("message.USER_DELETED", { lang: this.lang }));
      if (existUser.status === USER_STATUS.DEACTIVED)
        throw new UnauthorizedException(await this.i18n.t("message.USER_DEACTIVATED", { lang: this.lang }));
      payload = { userId: existUser.id, roleCode: existUser.roleCode };
    } else {
      const newUser = await this.userModel.create({ phone: userPhone, roleCode: ROLE_CODE.PARENT });
      payload = { userId: newUser.id, roleCode: newUser.roleCode };
    }

    const otpCode = this.generateOTPCode();
    const smsContent = await this.i18n.t("sms.OTP", { args: { otpCode }, lang: this.lang });
    this.smsService.send(userPhone, smsContent);
    return { otpToken: await this.generateOTPToken(otpCode, payload) };
  }
}
