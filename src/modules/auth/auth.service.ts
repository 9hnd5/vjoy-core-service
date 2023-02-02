import { Injectable } from "@nestjs/common";
import { LoginDTO } from "src/modules/auth/dto/login.dto";
import { JwtService } from "@nestjs/jwt";

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

  private async loginByEmail(email: string, password: string) {
    const payload = { userId: fakeUser.id, roleId: fakeUser.roleId };
    const secret = process.env.JWT_SECRET;
    const accessToken = await this.jwtService.signAsync(payload, { secret, expiresIn: "5m" });
    return { ...fakeUser, accessToken };
  }

  private loginByPhone(phone: string) {}
}
