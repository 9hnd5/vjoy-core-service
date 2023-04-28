import { ApiKey, BaseService, MailService, Role, ROLE_ID, SmsService, User, USER_PROVIDER, USER_STATUS } from "@common";
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/sequelize";
import * as bcrypt from "bcrypt";
import * as dayjs from "dayjs";
import { LoginTicket, OAuth2Client } from "google-auth-library";
import { Op } from "sequelize";
import { EMAIL_VERIFY_EXPIRES, GOOGLE_CLIENT_ID, MAX_RESEND_OTP_MINS, OTP_TOKEN_EXPIRES } from "./auth.constants";
import { CreateApiKeyDto } from "./dto/create-api-key.dto";
import {
  ForgetPasswordDto,
  SigninByEmailDto,
  SigninByGoogleDto,
  SigninByPhoneDto,
  SignupByEmailDto,
  SignupByPhoneDto,
} from "./dto/credential";
import { EMAIL_RESET_PASSWORD_EXPIRES } from "./auth.constants";

@Injectable()
export class AuthService extends BaseService {
  private expiresIn: string;
  private secret: string;
  private atSecret: string;
  constructor(
    configService: ConfigService,
    private jwtService: JwtService,
    private mailService: MailService,
    private smsService: SmsService,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(ApiKey) private apiKeyModel: typeof ApiKey
  ) {
    super();
    this.expiresIn = configService.get("JWT_EXPIRES") || "";
    this.secret = configService.get("JWT_SECRET") || "";
    this.atSecret = configService.get("JWT_API_TOKEN_SECRET") || "";
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

  signupByEmail = async (data: SignupByEmailDto) => {
    const { email, password } = data;
    const provider = USER_PROVIDER.EMAIL;

    const existUser = await this.userModel.findOne({
      where: { email },
      paranoid: false,
    });
    if (existUser) throw new BadRequestException(this.i18n.t("message.USER_EXISTED"));

    const newUser = await this.userModel.create({
      email,
      password: await this.createPassword(password),
      roleId: ROLE_ID.PARENT,
      provider,
    });

    // Gửi email xác nhận tài khoản
    const verifyToken = await this.jwtService.signAsync(
      { id: newUser.id, email: newUser.email },
      {
        secret: this.secret,
        expiresIn: EMAIL_VERIFY_EXPIRES
      }
    );
    const verifyLink = `https://vjoy-core-dev-qconrzsxya-de.a.run.app/api/v1/${process.env.ENV}/auth/verify-email?token=${verifyToken}`;
    const mail = {
      to: email,
      subject: this.i18n.t("email.SIGNUP_ACCOUNT_SUBJECT"),
      html: this.i18n.t("email.SIGNUP_ACCOUNT_BODY", { args: { email, verifyLink } }),
    };
    this.mailService.sendHtml(mail);

    return this.i18n.t("message.USER_REGISTRATION_SUCCESSFUL");
  };

  signinByEmail = async (data: SigninByEmailDto) => {
    const { email, password } = data;

    const existUser = await this.userModel.findOne({
      where: { email },
      paranoid: false,
      include: [Role],
    });

    if (!existUser) throw new BadRequestException(this.i18n.t("message.INVALID_CREDENTIAL"));

    if (existUser.deletedAt) throw new BadRequestException(this.i18n.t("message.USER_DELETED"));
    if (existUser.status === USER_STATUS.NEW)
      throw new BadRequestException(this.i18n.t("message.USER_NOT_ACTIVATED_YET"));
    if (existUser.status === USER_STATUS.DEACTIVED)
      throw new BadRequestException(this.i18n.t("message.USER_DEACTIVATED"));

    const isPasswordMatch = await this.comparePassword(password, existUser.password!);
    if (!isPasswordMatch) throw new BadRequestException(this.i18n.t("message.INVALID_CREDENTIAL"));

    return this.generateUserToken(existUser);
  };

  forgetPassword = async (data: ForgetPasswordDto) => {
    const { email } = data;

    const existUser = await this.userModel.findOne({
      where: { email },
      paranoid: false,
    });

    if (!existUser) throw new BadRequestException(this.i18n.t("message.INVALID_CREDENTIAL"));

    if (existUser.deletedAt) throw new BadRequestException(this.i18n.t("message.USER_DELETED"));
    if (existUser.status === USER_STATUS.NEW)
      throw new BadRequestException(this.i18n.t("message.USER_NOT_ACTIVATED_YET"));
    if (existUser.status === USER_STATUS.DEACTIVED)
      throw new BadRequestException(this.i18n.t("message.USER_DEACTIVATED"));

    // Gửi email reset password
    const resetToken = await this.jwtService.signAsync(
      { id: existUser.id, email: existUser.email },
      {
        secret: this.secret,
        expiresIn: EMAIL_RESET_PASSWORD_EXPIRES,
      }
    );
    const resetLink = `https://vjoy-core-dev-qconrzsxya-de.a.run.app/api/v1/${process.env.ENV}/auth/reset-password?token=${resetToken}`;
    const mail = {
      to: email,
      subject: this.i18n.t("email.RESET_PASSWORD_SUBJECT"),
      html: this.i18n.t("email.RESET_PASSWORD_BODY", { args: { email, resetLink } }),
    };
    this.mailService.sendHtml(mail);

    return this.i18n.t("message.REQUEST_RESET_PASSWORD_SUCCESSFUL");
  };
}
