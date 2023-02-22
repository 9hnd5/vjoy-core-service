import { Test } from "@nestjs/testing";
import {
  INestApplication,
  HttpStatus
} from "@nestjs/common";
import * as request from "supertest";
import { User } from "entities/user.entity";
import { AppModule } from "app.module";
import { Op } from "sequelize";
import { USER_STATUS } from "modules/users/users.constants";
import { AuthService } from "modules/auth/auth.service";
import { API_CORE_PREFIX } from "../test.util";

describe("Auth (e2e)", () => {
  let app: INestApplication;
  let userModel: typeof User;
  let verifySuccess;
  const user = {
    email: "api-test@vus-etsc.edu.vn", 
    password: "$2b$10$28xJRsHjH05F/TIbN76tL.akQT07qqPh6Zu2sac9O2pgOnKuRugyK", 
    phone: "0366033333",
    roleId: 1,
    status: USER_STATUS.ACTIVATED
  };

  const userDeactived = {
    email: "api-test-deactived@vus-etsc.edu.vn", 
    phone: "0366033334",
    roleId: 1,
    status: USER_STATUS.DEACTIVED
  };

  const userDeleted = {
    email: "api-test-deleted@vus-etsc.edu.vn", 
    phone: "0366033335",
    roleId: 1,
    status: USER_STATUS.ACTIVATED
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    app.enableVersioning();
    app.setGlobalPrefix("api");
    await app.init();

    userModel = moduleRef.get("UserRepository");
    await userModel.bulkCreate([user, userDeactived, userDeleted]);
    await userModel.destroy({ where: { email: "api-test-deleted@vus-etsc.edu.vn" } });

    const authService = moduleRef.get(AuthService);
    const otpCode = authService.generateOTPCode();
    const otpToken = await authService.generateOTPToken(otpCode, { userId: 1, roleId: 1 });
    verifySuccess = { otpCode, otpToken }
  });

  afterAll(async () => {
    await userModel.destroy({
      where: {
        [Op.or]: [{ email: { [Op.like]: "api-test%@vus-etsc.edu.vn" } }, { phone: '123456789' }],
      },
      force: true,
    });

    await app.close();
  });

  it("/auth/login (POST by email)", () => {
    const loginDTO = {
      type: "email",
      email: user.email,
      password: "123456",
    };

    return request(app.getHttpServer())
      .post(`${API_CORE_PREFIX}/auth/login`)
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
      email: "a@vus-etsc.edu.vn",
      password: "123456",
    };

    return request(app.getHttpServer())
      .post(`${API_CORE_PREFIX}/auth/login`)
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
      .post(`${API_CORE_PREFIX}/auth/login`)
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
      .post(`${API_CORE_PREFIX}/auth/login`)
      .send(loginDTO)
      .expect((response: request.Response) => {
        const { data } = response.body;
        expect(data).toHaveProperty("otpToken");
        expect(data).not.toHaveProperty("otpCode");
      })
      .expect(HttpStatus.CREATED);
  });

  it("/auth/login (POST by phone user not exist)", () => {
    const loginDTO = {
      type: "phone",
      phone: "123456789",
    };

    return request(app.getHttpServer())
      .post(`${API_CORE_PREFIX}/auth/login`)
      .send(loginDTO)
      .expect((response: request.Response) => {
        const { data } = response.body;

        expect(data).toHaveProperty("otpToken");
        expect(data).not.toHaveProperty("otpCode");
      })
      .expect(HttpStatus.CREATED);
  });

  it("should not login by phone if user deleted", () => {
    const loginDTO = {
      type: "phone",
      phone: "0366033335",
    };

    return request(app.getHttpServer())
      .post(`${API_CORE_PREFIX}/auth/login`)
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
      phone: "0366033334",
    };

    return request(app.getHttpServer())
      .post(`${API_CORE_PREFIX}/auth/login`)
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
      .post(`${API_CORE_PREFIX}/auth/otp`)
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
      .post(`${API_CORE_PREFIX}/auth/otp`)
      .send(verifyDTO)
      .expect((response: request.Response) => {
        const { code, message } = response.body.error;
        expect(code).not.toBeNull();
        expect(message).not.toBeNull();
      })
      .expect(HttpStatus.UNAUTHORIZED);
  });
});
