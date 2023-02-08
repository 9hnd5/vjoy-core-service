import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/sequelize";
import * as bcrypt from "bcrypt";
import { AUTH_ERROR_MESSAGE, OTP_TOKEN_EXPIRES, ROLE_CODE } from "src/modules/auth/auth.constants";
import { LoginDTO } from "src/modules/auth/dto/login.dto";
import { User } from "../users/entities/user.entity";
import { USER_STATUS } from "../users/users.constants";
import { Role } from "./entities/role.entity";

@Injectable()
export class AuthService {
  private expiresIn: string;
  private secret: string;
  constructor(
    private jwtService: JwtService,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(Role) private roleModel: typeof Role
  ) {
    this.expiresIn = process.env.JWT_EXPIRES || "";
    this.secret = process.env.JWT_SECRET || "";
  }

  login(data: LoginDTO) {
    const { type, email, password, phone } = data;
    if (type === "email") return this.loginByEmail(email, password);
    return this.loginByPhone(phone);
  }

  createPassword = (password: string) => bcrypt.hash(password, 10);

  comparePassword = (password: string, passwordHash: string) => bcrypt.compare(password, passwordHash);

  verifyOTP = async (otpToken: string, otpCode: string) => {
    try {
      const verifyResult = await this.jwtService.verifyAsync(otpToken, { secret: process.env.JWT_SECRET + otpCode });
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

  private generateOTP = () => `${Math.floor(Math.random() * 9000) + 1000}`; // 4 digits;

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
    if (!isPasswordMatch) return new UnauthorizedException(AUTH_ERROR_MESSAGE.INVALID_CREDENTIAL);

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

    const otpCode = this.generateOTP();
    const otpToken = await this.jwtService.signAsync(payload, {
      secret: this.secret + otpCode,
      expiresIn: OTP_TOKEN_EXPIRES,
    });
    return { otpToken, otpCode };
  }
}
