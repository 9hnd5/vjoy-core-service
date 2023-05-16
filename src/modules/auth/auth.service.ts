import { ApiKey, BaseService, MailService, Role, ROLE_ID, SmsService, User, USER_PROVIDER, USER_STATUS } from "@common";
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
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
  private expiresIn: string;
  private secret: string;
  private atSecret: string;
  constructor(
    configService: ConfigService,
    private jwtService: JwtService,
    private mailService: MailService,
    private smsService: SmsService,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(ApiKey) private apiKeyModel: typeof ApiKey,
    @InjectModel(OtpToken) private otpTokenModel: typeof OtpToken
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
      });
      payload = { userId: newUser.id, roleId: newUser.roleId };

      this.otpTokenModel.create({ id: newUser.id, lastSentOtp: dayjs().toDate() });
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

      payload = { userId: existUser.id, roleId: existUser.roleId };

      const otp_token = await this.otpTokenModel.findOne({ where: { id: existUser.id } });
      if (otp_token) {
        if (dayjs().diff(otp_token.lastSentOtp, "minutes") < MAX_RESEND_OTP_MINS)
          throw new BadRequestException(this.i18n.t("message.REQUEST_TOO_FAST"));

        otp_token.lastSentOtp = dayjs().toDate();
        otp_token.save();
      } else this.otpTokenModel.create({ id: existUser.id, lastSentOtp: dayjs().toDate() });
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

    this.otpTokenModel.create({ id: newUser.id, lastSentVerifyEmail: dayjs().toDate() });

    // Gửi email xác nhận tài khoản
    const verifyToken = await this.jwtService.signAsync(
      { id: newUser.id, email: newUser.email },
      {
        secret: this.secret,
        expiresIn: EMAIL_VERIFY_EXPIRES,
      }
    );
    const verifyLink = `https://vjoy-core-dev-qconrzsxya-de.a.run.app/api/v1/${process.env.ENV}/core/auth/verify-email?token=${verifyToken}`;
    const mail = {
      to: email,
      subject: this.i18n.t("email.SIGNUP_ACCOUNT_SUBJECT"),
      html: this.i18n.t("email.SIGNUP_ACCOUNT_BODY", { args: { email, verifyLink } }),
    };
    this.mailService.sendHtml(mail);

    return this.i18n.t("message.USER_REGISTRATION_SUCCESSFUL");
  };

  signinByEmail = async (data: SigninByEmailDto) => {
    const { password } = data;

    // const existUser = await this.userModel.findOne({
    //   where: { email },
    //   paranoid: false,
    //   include: [Role],
    // });
    const existUser = {
      status: USER_STATUS.ACTIVATED,
      password: "$2b$10$wRImQzXFUF3Au1NrfkPRU.F2G2tuf.3G8Hy23y8YLfzeeLSabN72q",
      roleId: ROLE_ID.PARENT,
      role: {
        permissions: [
          {
            action: "*",
            resource: "*",
          },
        ],
      } as Role,
    } as User;

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

  verifyEmail = async (token: string) => {
    try {
      const verifyResult = await this.jwtService.verifyAsync(token, { secret: this.secret });

      const existUser = (await this.userModel.findOne({
        where: { id: verifyResult.id, email: verifyResult.email },
      })) as User;

      existUser.status = USER_STATUS.ACTIVATED;
      await existUser.save();

      return { verified: true };
    } catch (err) {
      const result = await this.jwtService.verifyAsync(token, { secret: this.secret, ignoreExpiration: true });
      const resendToken = await this.jwtService.signAsync(
        { id: result.id, email: result.email },
        { secret: this.secret }
      );
      return { verified: false, resendToken };
    }
  };

  resendVerifyEmail = async (token: string) => {
    let result: any;
    try {
      result = await this.jwtService.verifyAsync(token, { secret: this.secret });
    } catch {
      throw new BadRequestException("Invalid resend token");
    }

    const existUser = await this.userModel.findOne({
      where: { email: result.email },
      paranoid: false,
    });
    if (!existUser) throw new BadRequestException(this.i18n.t("message.INVALID_CREDENTIAL"));

    if (existUser.deletedAt) throw new BadRequestException(this.i18n.t("message.USER_DELETED"));
    if (existUser.status === USER_STATUS.DEACTIVED)
      throw new BadRequestException(this.i18n.t("message.USER_DEACTIVATED"));

    const otp_token = await this.otpTokenModel.findOne({ where: { id: existUser.id } });

    if (otp_token) {
      const daydiff = dayjs(new Date()).diff(otp_token.lastSentVerifyEmail, "minutes");
      if (otp_token.countVerifyEmailRequest === 3 && daydiff <= MAX_RESEND_EMAIL_HOURS * 60)
        throw new BadRequestException(this.i18n.t("message.REQUEST_LIMITED"));

      otp_token.countVerifyEmailRequest += 1;
      if (daydiff > MAX_RESEND_EMAIL_HOURS * 60) otp_token.countVerifyEmailRequest = 0;
      otp_token.lastSentVerifyEmail = dayjs().toDate();
      otp_token.save();
    } else this.otpTokenModel.create({ id: existUser.id, lastSentVerifyEmail: dayjs().toDate() });

    // Gửi email xác nhận tài khoản
    const verifyToken = await this.jwtService.signAsync(
      { id: existUser.id, email: existUser.email },
      {
        secret: this.secret,
        expiresIn: EMAIL_VERIFY_EXPIRES,
      }
    );
    const verifyLink = `https://vjoy-core-dev-qconrzsxya-de.a.run.app/api/v1/${process.env.ENV}/core/auth/verify-email?token=${verifyToken}`;
    const mail = {
      to: result.email,
      subject: this.i18n.t("email.SIGNUP_ACCOUNT_SUBJECT"),
      html: this.i18n.t("email.SIGNUP_ACCOUNT_BODY", { args: { email: result.email, verifyLink } }),
    };
    this.mailService.sendHtml(mail);

    return this.i18n.t("message.USER_RESEND_REGISTRATION_SUCCESSFUL");
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
    const resetLink = `https://vjoy-core-dev-qconrzsxya-de.a.run.app/api/v1/${process.env.ENV}/core/auth/update-password?token=${resetToken}`;
    const mail = {
      to: email,
      subject: this.i18n.t("email.RESET_PASSWORD_SUBJECT"),
      html: this.i18n.t("email.RESET_PASSWORD_BODY", { args: { email, resetLink } }),
    };
    this.mailService.sendHtml(mail);

    return this.i18n.t("message.REQUEST_RESET_PASSWORD_SUCCESSFUL");
  };

  updatePassword = async (token: string) => {
    try {
      await this.jwtService.verifyAsync(token, { secret: this.secret });

      return { verified: true, token };
    } catch (err) {
      const result = await this.jwtService.verifyAsync(token, { secret: this.secret, ignoreExpiration: true });
      const resendToken = await this.jwtService.signAsync(
        { id: result.id, email: result.email },
        { secret: this.secret }
      );
      return { verified: false, resendToken };
    }
  };

  resendForgetPassword = async (token: string) => {
    let result: any;
    try {
      result = await this.jwtService.verifyAsync(token, { secret: this.secret });
    } catch {
      throw new BadRequestException("Invalid resend token");
    }

    const existUser = await this.userModel.findOne({
      where: { email: result.email },
      paranoid: false,
    });

    if (!existUser) throw new BadRequestException(this.i18n.t("message.INVALID_CREDENTIAL"));

    if (existUser.deletedAt) throw new BadRequestException(this.i18n.t("message.USER_DELETED"));
    if (existUser.status === USER_STATUS.NEW)
      throw new BadRequestException(this.i18n.t("message.USER_NOT_ACTIVATED_YET"));
    if (existUser.status === USER_STATUS.DEACTIVED)
      throw new BadRequestException(this.i18n.t("message.USER_DEACTIVATED"));

    const otp_token = await this.otpTokenModel.findOne({ where: { id: existUser.id } });
    if (otp_token) {
      const daydiff = dayjs(new Date()).diff(otp_token.lastSentUpdatePassword, "minutes");
      if (otp_token.countUpdatePasswordRequest === 3 && daydiff <= MAX_RESEND_EMAIL_HOURS * 60)
        throw new BadRequestException(this.i18n.t("message.REQUEST_LIMITED"));

      otp_token.countUpdatePasswordRequest += 1;
      if (daydiff > MAX_RESEND_EMAIL_HOURS * 60) otp_token.countUpdatePasswordRequest = 0;
      otp_token.lastSentUpdatePassword = dayjs().toDate();
      otp_token.save();
    } else this.otpTokenModel.create({ id: existUser.id, lastSentUpdatePassword: dayjs().toDate() });

    // Gửi email reset password
    const resetToken = await this.jwtService.signAsync(
      { id: existUser.id, email: existUser.email },
      {
        secret: this.secret,
        expiresIn: EMAIL_RESET_PASSWORD_EXPIRES,
      }
    );
    const resetLink = `https://vjoy-core-dev-qconrzsxya-de.a.run.app/api/v1/${process.env.ENV}/core/auth/update-password?token=${resetToken}`;
    const mail = {
      to: existUser.email!,
      subject: this.i18n.t("email.RESET_PASSWORD_SUBJECT"),
      html: this.i18n.t("email.RESET_PASSWORD_BODY", { args: { email: existUser.email, resetLink } }),
    };
    this.mailService.sendHtml(mail);

    return this.i18n.t("message.REQUEST_RESET_PASSWORD_SUCCESSFUL");
  };

  submitUpdatePassword = async (data: UpdatePasswordDto) => {
    if (data.password != data.confirmPassword) throw new BadRequestException("Passwords do not match");
    let result: any;
    try {
      result = await this.jwtService.verifyAsync(data.token, { secret: this.secret });
    } catch {
      throw new BadRequestException("Invalid token");
    }
    const existUser = await this.userModel.findOne({
      where: { email: result.email },
      paranoid: false,
    });

    if (!existUser) throw new NotFoundException(this.i18n.t("message.NOT_FOUND", { args: { data: "User" } }));

    if (existUser.deletedAt) throw new BadRequestException(this.i18n.t("message.USER_DELETED"));
    if (existUser.status === USER_STATUS.NEW)
      throw new BadRequestException(this.i18n.t("message.USER_NOT_ACTIVATED_YET"));
    if (existUser.status === USER_STATUS.DEACTIVED)
      throw new BadRequestException(this.i18n.t("message.USER_DEACTIVATED"));

    existUser.password = await this.createPassword(data.password);
    existUser.save();
    return "Password has been updated successfully";
  };

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
      if (existUser.deletedAt) throw new BadRequestException(this.i18n.t("message.USER_DELETED"));
      if (existUser.status === USER_STATUS.DEACTIVED)
        throw new BadRequestException(this.i18n.t("message.USER_DEACTIVATED"));

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
}
