import { ApiKey, BaseService, Role, ROLE_ID, SmsService, User, USER_PROVIDER, USER_STATUS } from "@common";
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/sequelize";
import * as bcrypt from "bcrypt";
import * as dayjs from "dayjs";
import { LoginTicket, OAuth2Client } from "google-auth-library";
import { Op } from "sequelize";
import { GOOGLE_CLIENT_ID, MAX_RESEND_OTP_MINS, OTP_TOKEN_EXPIRES } from "./auth.constants";
import { CreateApiKeyDto } from "./dto/create-api-key.dto";
import {
  SigninByEmailDto,
  SigninByGoogleDto,
  SigninByPhoneDto,
  SignupByEmailDto,
  SignupByPhoneDto,
} from "./dto/credential";
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
        attributes: ["id", "firstname", "lastname", "email", "password", "roleId"],
        include: Role,
      })) as User;
      existUser.status = USER_STATUS.ACTIVATED;
      await existUser.save();
      return this.generateUserToken(existUser);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        // Token has expired
        throw new UnauthorizedException(this.i18n.t("message.TOKEN_EXPIRED"));
      } else {
        // Token is invalid
        throw new UnauthorizedException(this.i18n.t("message.INVALID_CREDENTIAL"));
      }
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
      phone,
      roleId,
      role: { permissions },
    } = user;
    const payload = { userId: id, roleId };
    const accessToken = await this.jwtService.signAsync(payload, { secret: this.secret, expiresIn: this.expiresIn });
    return { id, firstname, lastname, email, phone, roleId, permissions, accessToken };
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
      payload = { userId: existUser.id, roleId: existUser.roleId };
    } else {
      const newUser = await this.userModel.create({ phone: userPhone, roleId: ROLE_ID.PARENT });
      payload = { userId: newUser.id, roleId: newUser.roleId };
    }

    const otpCode = this.generateOTPCode();
    if (this.request.user?.apiToken.type != "vjoy-test") {
      const smsContent = this.i18n.t("sms.OTP", { args: { otpCode, min: OTP_TOKEN_EXPIRES.replace("m", "") } });
      this.smsService.send(userPhone, smsContent as string);
    }

    return { otpToken: await this.generateOTPToken(otpCode, payload) };
  }

  async signupByPhone(data: SignupByPhoneDto) {
    let payload = {};
    const { phone } = data;

    const existUser = await this.userModel.findOne({ where: { phone }, paranoid: false });
    if (existUser) {
      throw new BadRequestException(this.i18n.t("message.USER_EXISTED"));
    } else {
      const newUser = await this.userModel.create({
        phone,
        roleId: ROLE_ID.PARENT,
        provider: USER_PROVIDER.PHONE,
        lastSentOtp: dayjs().toDate(),
      });
      payload = { userId: newUser.id, roleId: newUser.roleId };
    }

    const otpCode = this.generateOTPCode();
    if (this.request.user?.apiToken.type != "vjoy-test") {
      const smsContent = this.i18n.t("sms.OTP", { args: { otpCode, min: OTP_TOKEN_EXPIRES.replace("m", "") } });
      this.smsService.send(phone, smsContent as string);
    }

    return { otpToken: await this.generateOTPToken(otpCode, payload) };
  }

  async signinByPhone(data: SigninByPhoneDto) {
    let payload = {};
    const { phone } = data;

    const existUser = await this.userModel.findOne({ where: { phone }, paranoid: false });
    if (existUser) {
      if (existUser.deletedAt) throw new BadRequestException(this.i18n.t("message.USER_DELETED"));
      if (existUser.status === USER_STATUS.DEACTIVED)
        throw new BadRequestException(this.i18n.t("message.USER_DEACTIVATED"));
      if (dayjs().diff(existUser.lastSentOtp, "minutes") < MAX_RESEND_OTP_MINS)
        throw new BadRequestException(this.i18n.t("message.REQUEST_TOO_FAST"));

      payload = { userId: existUser.id, roleId: existUser.roleId };

      existUser.lastSentOtp = dayjs().toDate();
      existUser.save();
    } else {
      throw new BadRequestException(this.i18n.t("message.USER_NOT_EXISTS"));
    }

    const otpCode = this.generateOTPCode();
    if (this.request.user?.apiToken.type != "vjoy-test") {
      const smsContent = this.i18n.t("sms.OTP", { args: { otpCode, min: OTP_TOKEN_EXPIRES.replace("m", "") } });
      this.smsService.send(phone, smsContent as string);
    }

    return { otpToken: await this.generateOTPToken(otpCode, payload) };
  }

  async signinByGoogle(signin: SigninByGoogleDto) {
    const { idToken } = signin;

    let ticket: LoginTicket;
    try {
      const client = new OAuth2Client(GOOGLE_CLIENT_ID.CORE_SERVICE);
      ticket = await client.verifyIdToken({
        idToken,
        audience: Object.values(GOOGLE_CLIENT_ID),
      });
    } catch (e) {
      throw new BadRequestException(e.message);
    }
    const payload = ticket.getPayload();

    if (!payload) throw new UnauthorizedException(this.i18n.t("message.GOOGLE_NOT_FOUND"));

    const { sub: socialId, email, given_name, family_name } = payload;
    const existUser = await this.userModel.findOne({
      where: {
        [Op.or]: {
          ...(email && { email }),
          ...(socialId && { socialId }),
        },
        provider: USER_PROVIDER.GOOGLE,
      },
      include: [Role],
      paranoid: false,
    });

    if (existUser) {
      if (existUser.deletedAt) throw new BadRequestException(this.i18n.t("message.USER_DELETED"));
      if (existUser.status === USER_STATUS.DEACTIVED)
        throw new BadRequestException(this.i18n.t("message.USER_DEACTIVATED"));

      return this.generateUserToken(existUser);
    } else {
      const newUser = await this.userModel.create({
        firstname: given_name,
        lastname: family_name,
        ...(email && { email }),
        ...(socialId && { socialId }),
        roleId: ROLE_ID.PARENT,
        provider: USER_PROVIDER.GOOGLE,
        status: USER_STATUS.ACTIVATED,
      });

      return this.generateUserToken((await this.userModel.findByPk(newUser.id, { include: [Role] }))!);
    }
  }

  signup = async (data: SignupByEmailDto) => {
    const { password } = data;

    // let email: string | undefined;

    let phone: string | undefined;

    // let provider: string;

    // if (data instanceof SignupByEmailDto) {
    const email = data.email;
    const provider = USER_PROVIDER.EMAIL;
    // } else {
    //   phone = data.phone;
    //   provider = USER_PROVIDER.PHONE;
    // }

    const existUser = await this.userModel.findOne({
      where: {
        ...(email ? { email } : { phone }),
      },
      paranoid: false,
      include: [Role],
    });
    if (existUser) throw new BadRequestException(this.i18n.t("message.USER_EXISTED"));

    const newUser = await this.userModel.create({
      ...(email ? { email } : { phone }),
      password: await this.createPassword(password),
      roleId: ROLE_ID.PARENT,
      provider,
    });

    return this.generateUserToken((await this.userModel.findByPk(newUser.id, { include: [Role] }))!);
  };

  signin = async (data: SigninByEmailDto) => {
    const { password } = data;

    // let email: string | undefined;

    let phone: string | undefined;

    // if (data instanceof SigninByEmailDto) email = data.email;
    // else phone = data.phone;
    const email = data.email;

    const existUser = await this.userModel.findOne({
      where: {
        ...(email ? { email } : { phone }),
      },
      paranoid: false,
      include: [Role],
    });
    if (!existUser) throw new BadRequestException(this.i18n.t("message.INVALID_CREDENTIAL"));

    const isPasswordMatch = await this.comparePassword(password, existUser.password!);
    if (!isPasswordMatch) throw new BadRequestException(this.i18n.t("message.INVALID_CREDENTIAL"));

    return this.generateUserToken(existUser);
  };
}
