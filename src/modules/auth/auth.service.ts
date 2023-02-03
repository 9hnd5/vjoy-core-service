import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { OTP_TOKEN_EXPIRES } from "src/modules/auth/auth.constants";
import { LoginDTO } from "src/modules/auth/dto/login.dto";

const fakeUser = {
  id: 1,
  firstname: "Huy",
  lastname: "Nguyễn",
  roleId: 7,
};

@Injectable()
export class AuthService {
  private expiresIn: string;
  private secret: string;
  constructor(private jwtService: JwtService) {
    this.expiresIn = process.env.JWT_EXPIRES || "";
    this.secret = process.env.JWT_SECRET || "";
  }

  login(data: LoginDTO) {
    const { type, email, password, phone } = data;
    if (type === "email") return this.loginByEmail(email!, password!);
    return this.loginByPhone(phone!);
  }

  createPassword = (password: string) => bcrypt.hash(password, 10);

  comparePassword = (password: string, passwordHash: string) => bcrypt.compare(password, passwordHash);

  verifyOTP = async (otpToken: string, otpCode: string) => {
    try {
      const result = await this.jwtService.verifyAsync(otpToken, { secret: process.env.JWT_SECRET + otpCode });
      return this.loginByPhone(result.phone);
    } catch (err) {
      throw new UnauthorizedException();
    }
  };

  private generateOTP = () => `${Math.floor(Math.random() * 9000) + 1000}`; // 4 digits;

  private async loginByEmail(email: string, password: string) {
    /**
     * Todo
     * Get the real user in database instead of fakeUser
     */
    if (email !== "admin@gmail.com" || password !== "admin") throw new UnauthorizedException("Invalid Credential");
    const payload = { userId: fakeUser.id, roleId: fakeUser.roleId };
    const accessToken = await this.jwtService.signAsync(payload, { secret: this.secret, expiresIn: this.expiresIn });
    return { ...fakeUser, accessToken };
  }

  private async loginByPhone(phone: string) {
    /**
     * Todo
     * Check the phone number is exist or not
     * Call sms service send otp to user
     * Get the real user in database instead of fakeUser
     */
    const payload = { userId: fakeUser.id, roleId: fakeUser.roleId, phone };
    const otpCode = this.generateOTP();
    const optToken = await this.jwtService.signAsync(payload, {
      secret: this.secret + otpCode,
      expiresIn: OTP_TOKEN_EXPIRES,
    });
    return { optToken, otpCode };
  }
}
