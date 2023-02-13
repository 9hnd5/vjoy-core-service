import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  HttpStatus,
  ValidationError,
  ValidationPipe,
  UnprocessableEntityException,
} from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SequelizeModule } from "@nestjs/sequelize";
import * as request from "supertest";
import { AuthModule } from "./auth.module";
import { Role } from "entities/role.entity";
import { User } from "entities/user.entity";
import { SequelizeOptions } from "utils/sequelize-options";
import { ResponseInterceptor } from "interceptors/response.interceptor";
import { Sequelize } from "sequelize";

const models = [Role, User];

describe("AuthService (e2e)", () => {
  let app: INestApplication;
  let testModule: TestingModule;
  let sequelize;
  let verifySuccess;
  const user = {
    email: "test@gmail.com", 
    password: "$2b$10$28xJRsHjH05F/TIbN76tL.akQT07qqPh6Zu2sac9O2pgOnKuRugyK", 
    phone: "0366033333",
    roleId: 4,
    status: 1
  };

  beforeAll(async () => {
    testModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ envFilePath: `./env/.dev.env` }),
        SequelizeModule.forFeature(models),
        SequelizeModule.forRoot(SequelizeOptions()),
        AuthModule,
      ]
    }).compile();

    app = testModule.createNestApplication();
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        exceptionFactory(errors: ValidationError[]) {
          return new UnprocessableEntityException(errors);
        },
      })
    );
    await app.init();

    sequelize = new Sequelize(SequelizeOptions());
    await sequelize.query(`INSERT users (email, password, phone, roleId, status) VALUES('${user.email}', '${user.password}', '${user.phone}', ${user.roleId}, ${user.status})`);
  });

  afterAll(async () => {
    await sequelize.query(`DELETE FROM users WHERE email='${user.email}' or phone='123456789'`)

    await app.close();
    await testModule.close();
  });

  it("/auth/login (POST by email)", () => {
    const loginDTO = {
      type: "email",
      email: user.email,
      password: "123456",
    };

    return request(app.getHttpServer())
      .post("/auth/login")
      .send(loginDTO)
      .expect((response: request.Response) => {
        const { email, accessToken } = response.body.data;

        expect(email).toEqual(loginDTO.email);
        expect(accessToken).not.toBeNull();
      })
      .expect(HttpStatus.CREATED);
  });

  it("should not login by email if user not exist", () => {
    const loginDTO = {
      type: "email",
      email: "a@mail.com",
      password: "123456",
    };

    return request(app.getHttpServer())
      .post("/auth/login")
      .send(loginDTO)
      .expect((response: request.Response) => {
        const { code, message } = response.body.error;
        expect(code).not.toBeNull();
        expect(message).not.toBeNull();
      })
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it("should not login by email if wrong password", () => {
    const loginDTO = {
      type: "email",
      email: user.email,
      password: "12345",
    };

    return request(app.getHttpServer())
      .post("/auth/login")
      .send(loginDTO)
      .expect((response: request.Response) => {
        const { code, message } = response.body.error;
        expect(code).not.toBeNull();
        expect(message).not.toBeNull();
      })
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it("/auth/login (POST by phone user exist)", () => {
    const loginDTO = {
      type: "phone",
      phone: "0366033333",
    };

    return request(app.getHttpServer())
      .post("/auth/login")
      .send(loginDTO)
      .expect((response: request.Response) => {
        const { otpToken, otpCode } = response.body.data;
        verifySuccess = { otpToken, otpCode };
        expect(otpToken).not.toBeNull();
        expect(otpCode).toBeNull();
      })
      .expect(HttpStatus.CREATED);
  });

  it("/auth/login (POST by phone user not exist)", () => {
    const loginDTO = {
      type: "phone",
      phone: "123456789",
    };

    return request(app.getHttpServer())
      .post("/auth/login")
      .send(loginDTO)
      .expect((response: request.Response) => {
        const { otpToken, otpCode } = response.body.data;

        expect(otpToken).not.toBeNull();
        expect(otpCode).toBeNull();
      })
      .expect(HttpStatus.CREATED);
  });

  it("should not login by phone if user deleted", () => {
    const loginDTO = {
      type: "phone",
      phone: "0388849503",
    };

    return request(app.getHttpServer())
      .post("/auth/login")
      .send(loginDTO)
      .expect((response: request.Response) => {
        const { code, message } = response.body.error;
        expect(code).not.toBeNull();
        expect(message).not.toBeNull();
      })
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it("should not login by phone if user deactived", () => {
    const loginDTO = {
      type: "phone",
      phone: "0388849504",
    };

    return request(app.getHttpServer())
      .post("/auth/login")
      .send(loginDTO)
      .expect((response: request.Response) => {
        const { code, message } = response.body.error;
        expect(code).not.toBeNull();
        expect(message).not.toBeNull();
      })
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it("/auth/otp", () => {
    return request(app.getHttpServer())
      .post("/auth/otp")
      .send(verifySuccess)
      .expect((response: request.Response) => {
        const { accessToken } = response.body.data;

        expect(accessToken).not.toBeNull();
      })
      .expect(HttpStatus.CREATED);
  });

  it("should not verify otp", () => {
    const verifyDTO = {
      otpToken:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEzLCJyb2xlSWQiOjQsImlhdCI6MTY3NTkzNjkyNywiZXhwIjoxNjc1OTM3MjI3fQ.bH7gCcM73l7drMish8o_h1ALga-gpKtTdL4s5keRyHU",
      otpCode: "8634",
    };

    return request(app.getHttpServer())
      .post("/auth/otp")
      .send(verifyDTO)
      .expect((response: request.Response) => {
        const { code, message } = response.body.error;
        expect(code).not.toBeNull();
        expect(message).not.toBeNull();
      })
      .expect(HttpStatus.UNAUTHORIZED);
  });
});
