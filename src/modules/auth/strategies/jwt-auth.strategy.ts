import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import { HEADER_KEY } from "utils/constants";

@Injectable()
export class JwtAuthStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(private configService: ConfigService, private jwtService: JwtService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true,
      passReqToCallback: true,
      secretOrKey: configService.get("JWT_SECRET"),
    });
  }

  async validate(request: Request, payload: any) {
    const apiToken = request.headers[HEADER_KEY.API_TOKEN] as string;
    try {
      const result = await this.jwtService.verifyAsync(apiToken, { secret: this.configService.get("JWT_SECRET") });
      return { apiTokenPayload: result, ...payload };
    } catch {
      throw new UnauthorizedException();
    }
  }
}
