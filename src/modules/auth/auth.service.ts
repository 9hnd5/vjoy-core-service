import {
  ApiKey,
  BaseService,
  HEADER_KEY,
  MailService,
  Role,
  ROLE_ID,
  SmsService,
  User,
  USER_PROVIDER,
  USER_STATUS,
  EnvironmentService,
} from "@common";
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/sequelize";
import * as bcrypt from "bcrypt";
import * as dayjs from "dayjs";
import { LoginTicket, OAuth2Client } from "google-auth-library";
import * as jwksClient from "jwks-rsa";
import { Op } from "sequelize";
import {
  EMAIL_RESET_PASSWORD_EXPIRES,
  EMAIL_VERIFY_EXPIRES,
  GOOGLE_CLIENT_ID,
  MAX_RESEND_EMAIL_HOURS,
  MAX_RESEND_OTP_MINS,
  OTP_TOKEN_EXPIRES,
} from "./auth.constants";
import { CreateApiKeyDto } from "./dto/create-api-key.dto";
import {
  ForgetPasswordDto,
  SigninByAppleDto,
  SigninByEmailDto,
  SigninByGoogleDto,
  SigninByPhoneDto,
  SignupByEmailDto,
  SignupByPhoneDto,
  UpdatePasswordDto,
} from "./dto/credential";
import { OtpToken } from "entities/otp-token.entity";
import { I18nTranslations } from "i18n/i18n.generated";

@Injectable()
export class AuthService extends BaseService<I18nTranslations> {
  private accessTokenExpiresIn: string;
  private accessTokenSecret: string;

  private apiTokenSecret: string;

  private refreshTokenSecret: string;
  private refreshTokenExpiresIn: string;

  constructor(
    private envService: EnvironmentService,
    private jwtService: JwtService,
    private mailService: MailService,
    private smsService: SmsService,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(ApiKey) private apiKeyModel: typeof ApiKey,
    @InjectModel(OtpToken) private otpTokenModel: typeof OtpToken
  ) {
    super();
    this.accessTokenExpiresIn = envService.get("ACCESS_TOKEN_EXPIRES") || "";
    this.accessTokenSecret = envService.get("ACCESS_TOKEN_SECRET") || "";
    this.apiTokenSecret = envService.get("API_TOKEN_SECRET") || "";
    this.refreshTokenSecret = envService.get("REFRESH_TOKEN_SECRET") || "";
    this.refreshTokenExpiresIn = envService.get("REFRESH_TOKEN_EXPIRES") || "";
  }

  createPassword = (password: string) => bcrypt.hash(password, 10);

  comparePassword = (password: string, passwordHash: string) => bcrypt.compare(password, passwordHash);

  generateOtpToken = (otpCode: string, payload: Record<string, any>) => {
    return this.jwtService.signAsync(payload, {
      secret: this.accessTokenSecret + otpCode,
      expiresIn: OTP_TOKEN_EXPIRES,
    });
  };

  verifyOtpToken = (otpCode: string, otpToken: string) => {
    return this.jwtService.verifyAsync(otpToken, { secret: this.accessTokenSecret + otpCode });
  };

  generateOtpCode = () => {
    return `${Math.floor(Math.random() * 9000) + 1000}`; // 4 digits;
  };

  private generateUserToken = async (user: User, refreshToken?: string) => {
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
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.accessTokenSecret,
      expiresIn: this.accessTokenExpiresIn,
    });
    return {
      id,
      firstname,
      lastname,
      email,
      phone,
      roleId,
      permissions,
      accessToken,
      refreshToken:
        refreshToken ??
        (await this.jwtService.signAsync(payload, {
          secret: this.refreshTokenSecret,
          expiresIn: this.refreshTokenExpiresIn,
        })),
    };
  };

  async createApiKey(data: CreateApiKeyDto) {
    const { type, name, description } = data;
    const env = process.env.ENV!;
    const payload = { name, type, env };
    const apiToken = await this.jwtService.signAsync(payload, { secret: this.apiTokenSecret });
    const newApiKey = await this.apiKeyModel.create({
      apiToken,
      env,
      type,
      name,
      description,
    });
    return newApiKey.dataValues;
  }

  async deleteApiKey(id: number) {
    const existApiKey = await this.apiKeyModel.findOne({ where: { id } });
    if (!existApiKey) throw new NotFoundException();
    return this.apiKeyModel.destroy({ where: { id } });
  }

  async verifyOtp(otpToken: string, otpCode: string) {
    try {
      const verifyResult = await this.verifyOtpToken(otpCode, otpToken);

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
        throw new UnauthorizedException(this.i18n.t("auth.TOKEN_EXPIRED"));
      } else {
        // Token is invalid
        throw new UnauthorizedException(this.i18n.t("auth.INVALID_CREDENTIAL"));
      }
    }
  }

  async refreshToken() {
    const refreshToken = this.request.headers[HEADER_KEY.REFRESH_TOKEN] as string | undefined;
    if (!refreshToken)
      throw new UnauthorizedException(this.i18n.t("message.INVALID", { args: { data: "Refresh Token" } }));

    let result: any;
    try {
      result = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.refreshTokenSecret,
        ignoreExpiration: true,
      });
    } catch (error) {
      throw new UnauthorizedException(this.i18n.t("message.INVALID", { args: { data: "Refresh Token" } }));
    }

    const user = await this.userModel.findByPk(result.userId, {
      paranoid: false,
      include: [Role],
    });

    return this.generateUserToken(user!, refreshToken);
  }

  async signupByPhone(data: SignupByPhoneDto) {
    let payload = {};
    const { phone } = data;

    const existUser = await this.userModel.findOne({ where: { phone }, paranoid: false });
    if (existUser) {
      throw new BadRequestException(this.i18n.t("auth.USER_EXISTED"));
    } else {
      const newUser = await this.userModel.create({
        phone,
        roleId: ROLE_ID.PARENT,
        provider: USER_PROVIDER.PHONE,
      });
      payload = { userId: newUser.id, roleId: newUser.roleId };

      this.otpTokenModel.create({ id: newUser.id, lastSentOtp: dayjs().toDate() });
    }

    const otpCode = this.generateOtpCode();
    if (this.request.user?.apiToken.type != "vjoy-test") {
      const smsContent = this.i18n.t("auth.OTP", { args: { otpCode, min: OTP_TOKEN_EXPIRES.replace("m", "") } });
      this.smsService.send(phone, smsContent as string);
    }

    return { otpToken: await this.generateOtpToken(otpCode, payload) };
  }

  async signinByPhone(data: SigninByPhoneDto) {
    let payload = {};
    const { phone } = data;

    const existUser = await this.userModel.findOne({ where: { phone }, paranoid: false });
    if (existUser) {
      if (existUser.deletedAt) throw new BadRequestException(this.i18n.t("auth.USER_DELETED"));
      if (existUser.status === USER_STATUS.DEACTIVED)
        throw new BadRequestException(this.i18n.t("auth.USER_DEACTIVATED"));

      payload = { userId: existUser.id, roleId: existUser.roleId };

      const otp_token = await this.otpTokenModel.findOne({ where: { id: existUser.id } });
      if (otp_token) {
        if (dayjs().diff(otp_token.lastSentOtp, "minutes") < MAX_RESEND_OTP_MINS)
          throw new BadRequestException(this.i18n.t("auth.REQUEST_TOO_FAST"));

        otp_token.lastSentOtp = dayjs().toDate();
        otp_token.save();
      } else this.otpTokenModel.create({ id: existUser.id, lastSentOtp: dayjs().toDate() });
    } else {
      throw new BadRequestException(this.i18n.t("auth.USER_NOT_EXISTS"));
    }

    const otpCode = this.generateOtpCode();
    if (this.request.user?.apiToken.type != "vjoy-test") {
      const smsContent = this.i18n.t("auth.OTP", { args: { otpCode, min: OTP_TOKEN_EXPIRES.replace("m", "") } });
      this.smsService.send(phone, smsContent as string);
    }

    return { otpToken: await this.generateOtpToken(otpCode, payload) };
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

    if (!payload)
      throw new UnauthorizedException(this.i18n.t("message.NOT_FOUND", { args: { data: "Google Account" } }));

    const { sub: socialId, email, given_name, family_name } = payload;
    const existUser = await this.userModel.findOne({
      where: {
        [Op.or]: {
          ...(email && { email }),
          ...(socialId && { socialId }),
        },
      },
      include: [Role],
      paranoid: false,
    });

    if (existUser) {
      if (existUser.deletedAt) throw new BadRequestException(this.i18n.t("auth.USER_DELETED"));
      if (existUser.status === USER_STATUS.DEACTIVED)
        throw new BadRequestException(this.i18n.t("auth.USER_DEACTIVATED"));

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

  async signupByEmail(data: SignupByEmailDto) {
    const { email, password } = data;
    const provider = USER_PROVIDER.EMAIL;

    const existUser = await this.userModel.findOne({
      where: { email },
      paranoid: false,
    });
    if (existUser) throw new BadRequestException(this.i18n.t("auth.USER_EXISTED"));

    const newUser = await this.userModel.create({
      email,
      password: await this.createPassword(password),
      roleId: ROLE_ID.PARENT,
      provider,
    });

    this.otpTokenModel.create({ id: newUser.id, lastSentVerifyEmail: dayjs().toDate() });

    // Gửi email xác nhận tài khoản
    const verifyToken = await this.jwtService.signAsync(
      { id: newUser.id, email: newUser.email },
      {
        secret: this.accessTokenSecret,
        expiresIn: EMAIL_VERIFY_EXPIRES,
      }
    );
    const verifyLink = `https://vjoy-core-dev-qconrzsxya-de.a.run.app/api/v1/${process.env.ENV}/core/auth/verify-email?token=${verifyToken}`;
    const mail = {
      to: email,
      subject: this.i18n.t("auth.SIGNUP_ACCOUNT_SUBJECT"),
      html: this.i18n.t("auth.SIGNUP_ACCOUNT_BODY", { args: { email, verifyLink } }),
    };
    this.mailService.sendHtml(mail);

    return this.i18n.t("auth.USER_REGISTRATION_SUCCESSFUL");
  }

  async signinByEmail(data: SigninByEmailDto) {
    const { email, password } = data;

    const existUser = await this.userModel.findOne({
      where: { email },
      paranoid: false,
      include: [Role],
    });

    if (!existUser) throw new BadRequestException(this.i18n.t("auth.INVALID_CREDENTIAL"));

    if (existUser.deletedAt) throw new BadRequestException(this.i18n.t("auth.USER_DELETED"));
    if (existUser.status === USER_STATUS.NEW) throw new BadRequestException(this.i18n.t("auth.USER_NOT_ACTIVATED_YET"));
    if (existUser.status === USER_STATUS.DEACTIVED) throw new BadRequestException(this.i18n.t("auth.USER_DEACTIVATED"));

    const isPasswordMatch = await this.comparePassword(password, existUser.password!);
    if (!isPasswordMatch) throw new BadRequestException(this.i18n.t("auth.INVALID_CREDENTIAL"));

    return this.generateUserToken(existUser);
  }

  async signinByApple(signin: SigninByAppleDto) {
    const { firstname, lastname, email, idToken } = signin;

    let applePublicKey: string;
    try {
      // Step 1: Fetch Apple's public keys for verifying ID tokens
      const jwksClientInstance = jwksClient({
        jwksUri: "https://appleid.apple.com/auth/keys",
      });

      const decodedIdToken: any = this.jwtService.decode(idToken, { complete: true });
      const kid = decodedIdToken.header.kid;

      applePublicKey = await new Promise((resolve, reject) => {
        jwksClientInstance.getSigningKey(kid, (err, key) => {
          if (err) {
            reject(new UnauthorizedException("Failed to retrieve public key"));
          } else {
            resolve(key?.getPublicKey() as string);
          }
        });
      });
    } catch (e) {
      throw new BadRequestException(e.message);
    }

    let socialId: string;
    try {
      // Step 2: Verify ID token signature and decode its payload
      const decodedIdTokenPayload = await this.jwtService.verifyAsync(idToken, {
        publicKey: applePublicKey, // Replace with the actual public key
        algorithms: ["RS256"],
        audience: "vn.edu.vus.vjoy.service",
        issuer: "https://appleid.apple.com",
      });

      socialId = decodedIdTokenPayload.sub;
    } catch (e) {
      throw new UnauthorizedException("Invalid ID token signature");
    }

    const existUser = await this.userModel.findOne({
      where: {
        [Op.or]: {
          ...(email && { email }),
          ...(socialId && { socialId }),
        },
      },
      include: [Role],
      paranoid: false,
    });

    if (existUser) {
      if (existUser.deletedAt) throw new BadRequestException(this.i18n.t("auth.USER_DELETED"));
      if (existUser.status === USER_STATUS.DEACTIVED)
        throw new BadRequestException(this.i18n.t("auth.USER_DEACTIVATED"));

      return this.generateUserToken(existUser);
    } else {
      const newUser = await this.userModel.create({
        firstname,
        lastname,
        ...(email && { email }),
        socialId,
        roleId: ROLE_ID.PARENT,
        provider: USER_PROVIDER.APPLE,
        status: USER_STATUS.ACTIVATED,
      });

      return this.generateUserToken((await this.userModel.findByPk(newUser.id, { include: [Role] }))!);
    }
  }

  async signupByGuest() {
    const newUser = await this.userModel.create({
      roleId: ROLE_ID.PARENT,
      status: USER_STATUS.ACTIVATED,
    });

    return this.generateUserToken((await this.userModel.findByPk(newUser.id, { include: [Role] }))!);
  }

  async verifyEmail(token: string) {
    try {
      const verifyResult = await this.jwtService.verifyAsync(token, { secret: this.accessTokenSecret });

      const existUser = (await this.userModel.findOne({
        where: { id: verifyResult.id, email: verifyResult.email },
      })) as User;

      existUser.status = USER_STATUS.ACTIVATED;
      await existUser.save();

      return { verified: true };
    } catch (err) {
      const result = await this.jwtService.verifyAsync(token, {
        secret: this.accessTokenSecret,
        ignoreExpiration: true,
      });
      const resendToken = await this.jwtService.signAsync(
        { id: result.id, email: result.email },
        { secret: this.accessTokenSecret }
      );
      return { verified: false, resendToken };
    }
  }

  async resendVerifyEmail(token: string) {
    let result: any;
    try {
      result = await this.jwtService.verifyAsync(token, { secret: this.accessTokenSecret });
    } catch {
      throw new BadRequestException("Invalid resend token");
    }

    const existUser = await this.userModel.findOne({
      where: { email: result.email },
      paranoid: false,
    });
    if (!existUser) throw new BadRequestException(this.i18n.t("auth.INVALID_CREDENTIAL"));

    if (existUser.deletedAt) throw new BadRequestException(this.i18n.t("auth.USER_DELETED"));
    if (existUser.status === USER_STATUS.DEACTIVED) throw new BadRequestException(this.i18n.t("auth.USER_DEACTIVATED"));

    const otp_token = await this.otpTokenModel.findOne({ where: { id: existUser.id } });

    if (otp_token) {
      const daydiff = dayjs(new Date()).diff(otp_token.lastSentVerifyEmail, "minutes");
      if (otp_token.countVerifyEmailRequest === 3 && daydiff <= MAX_RESEND_EMAIL_HOURS * 60)
        throw new BadRequestException(this.i18n.t("auth.REQUEST_LIMITED"));

      otp_token.countVerifyEmailRequest += 1;
      if (daydiff > MAX_RESEND_EMAIL_HOURS * 60) otp_token.countVerifyEmailRequest = 0;
      otp_token.lastSentVerifyEmail = dayjs().toDate();
      otp_token.save();
    } else this.otpTokenModel.create({ id: existUser.id, lastSentVerifyEmail: dayjs().toDate() });

    // Gửi email xác nhận tài khoản
    const verifyToken = await this.jwtService.signAsync(
      { id: existUser.id, email: existUser.email },
      {
        secret: this.accessTokenSecret,
        expiresIn: EMAIL_VERIFY_EXPIRES,
      }
    );
    const verifyLink = `https://vjoy-core-dev-qconrzsxya-de.a.run.app/api/v1/${process.env.ENV}/core/auth/verify-email?token=${verifyToken}`;
    const mail = {
      to: result.email,
      subject: this.i18n.t("auth.SIGNUP_ACCOUNT_SUBJECT"),
      html: this.i18n.t("auth.SIGNUP_ACCOUNT_BODY", { args: { email: result.email, verifyLink } }),
    };
    this.mailService.sendHtml(mail);

    return this.i18n.t("auth.USER_RESEND_REGISTRATION_SUCCESSFUL");
  }

  async forgetPassword(data: ForgetPasswordDto) {
    const { email } = data;

    const existUser = await this.userModel.findOne({
      where: { email },
      paranoid: false,
    });

    if (!existUser) throw new BadRequestException(this.i18n.t("auth.INVALID_CREDENTIAL"));

    if (existUser.deletedAt) throw new BadRequestException(this.i18n.t("auth.USER_DELETED"));
    if (existUser.status === USER_STATUS.NEW) throw new BadRequestException(this.i18n.t("auth.USER_NOT_ACTIVATED_YET"));
    if (existUser.status === USER_STATUS.DEACTIVED) throw new BadRequestException(this.i18n.t("auth.USER_DEACTIVATED"));

    // Gửi email reset password
    const resetToken = await this.jwtService.signAsync(
      { id: existUser.id, email: existUser.email },
      {
        secret: this.accessTokenSecret,
        expiresIn: EMAIL_RESET_PASSWORD_EXPIRES,
      }
    );
    const resetLink = `https://vjoy-core-dev-qconrzsxya-de.a.run.app/api/v1/${process.env.ENV}/core/auth/update-password?token=${resetToken}`;
    const mail = {
      to: email,
      subject: this.i18n.t("auth.RESET_PASSWORD_SUBJECT"),
      html: this.i18n.t("auth.RESET_PASSWORD_BODY", { args: { email, resetLink } }),
    };
    this.mailService.sendHtml(mail);

    return this.i18n.t("auth.REQUEST_RESET_PASSWORD_SUCCESSFUL");
  }

  async updatePassword(token: string) {
    try {
      await this.jwtService.verifyAsync(token, { secret: this.accessTokenSecret });

      return { verified: true, token };
    } catch (err) {
      const result = await this.jwtService.verifyAsync(token, {
        secret: this.accessTokenSecret,
        ignoreExpiration: true,
      });
      const resendToken = await this.jwtService.signAsync(
        { id: result.id, email: result.email },
        { secret: this.accessTokenSecret }
      );
      return { verified: false, resendToken };
    }
  }

  async resendForgetPassword(token: string) {
    let result: any;
    try {
      result = await this.jwtService.verifyAsync(token, { secret: this.accessTokenSecret });
    } catch {
      throw new BadRequestException("Invalid resend token");
    }

    const existUser = await this.userModel.findOne({
      where: { email: result.email },
      paranoid: false,
    });

    if (!existUser) throw new BadRequestException(this.i18n.t("auth.INVALID_CREDENTIAL"));

    if (existUser.deletedAt) throw new BadRequestException(this.i18n.t("auth.USER_DELETED"));
    if (existUser.status === USER_STATUS.NEW) throw new BadRequestException(this.i18n.t("auth.USER_NOT_ACTIVATED_YET"));
    if (existUser.status === USER_STATUS.DEACTIVED) throw new BadRequestException(this.i18n.t("auth.USER_DEACTIVATED"));

    const otp_token = await this.otpTokenModel.findOne({ where: { id: existUser.id } });
    if (otp_token) {
      const daydiff = dayjs(new Date()).diff(otp_token.lastSentUpdatePassword, "minutes");
      if (otp_token.countUpdatePasswordRequest === 3 && daydiff <= MAX_RESEND_EMAIL_HOURS * 60)
        throw new BadRequestException(this.i18n.t("auth.REQUEST_LIMITED"));

      otp_token.countUpdatePasswordRequest += 1;
      if (daydiff > MAX_RESEND_EMAIL_HOURS * 60) otp_token.countUpdatePasswordRequest = 0;
      otp_token.lastSentUpdatePassword = dayjs().toDate();
      otp_token.save();
    } else this.otpTokenModel.create({ id: existUser.id, lastSentUpdatePassword: dayjs().toDate() });

    // Gửi email reset password
    const resetToken = await this.jwtService.signAsync(
      { id: existUser.id, email: existUser.email },
      {
        secret: this.accessTokenSecret,
        expiresIn: EMAIL_RESET_PASSWORD_EXPIRES,
      }
    );
    const resetLink = `https://vjoy-core-dev-qconrzsxya-de.a.run.app/api/v1/${process.env.ENV}/core/auth/update-password?token=${resetToken}`;
    const mail = {
      to: existUser.email!,
      subject: this.i18n.t("auth.RESET_PASSWORD_SUBJECT"),
      html: this.i18n.t("auth.RESET_PASSWORD_BODY", { args: { email: existUser.email, resetLink } }),
    };
    this.mailService.sendHtml(mail);

    return this.i18n.t("auth.REQUEST_RESET_PASSWORD_SUCCESSFUL");
  }

  async submitUpdatePassword(data: UpdatePasswordDto) {
    if (data.password != data.confirmPassword) throw new BadRequestException("Passwords do not match");
    let result: any;
    try {
      result = await this.jwtService.verifyAsync(data.token, { secret: this.accessTokenSecret });
    } catch {
      throw new BadRequestException("Invalid token");
    }
    const existUser = await this.userModel.findOne({
      where: { email: result.email },
      paranoid: false,
    });

    if (!existUser) throw new NotFoundException(this.i18n.t("message.NOT_FOUND", { args: { data: "User" } }));

    if (existUser.deletedAt) throw new BadRequestException(this.i18n.t("auth.USER_DELETED"));
    if (existUser.status === USER_STATUS.NEW) throw new BadRequestException(this.i18n.t("auth.USER_NOT_ACTIVATED_YET"));
    if (existUser.status === USER_STATUS.DEACTIVED) throw new BadRequestException(this.i18n.t("auth.USER_DEACTIVATED"));

    existUser.password = await this.createPassword(data.password);
    existUser.save();
    return "Password has been updated successfully";
  }
}
