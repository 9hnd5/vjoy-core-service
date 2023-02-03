import { Injectable } from "@nestjs/common";
import { LoginDTO } from "src/modules/auth/dto/login.dto";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";

const fakeUser = {
  id: 1,
  firstname: "Huy",
  lastname: "Nguyễn",
  roleId: 7,
};

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  login(data: LoginDTO) {
    const { type, email, password, phone } = data;
    if (type === "email") return this.loginByEmail(email!, password!);
    this.loginByPhone(phone!);
  }

  createPassword(password: string) {
    const saltRound = 10;
    return bcrypt.hash(password, saltRound);
  }

  comparePassword(password: string, passwordHash: string) {
    return bcrypt.compare(password, passwordHash);
  }

  private async loginByEmail(email: string, password: string) {
    const payload = { userId: fakeUser.id, roleId: fakeUser.roleId };
    const secret = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRES;
    const accessToken = await this.jwtService.signAsync(payload, { secret, expiresIn });
    return { ...fakeUser, accessToken };
  }

  private loginByPhone(phone: string) {}
}
