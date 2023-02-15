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

describe("Auth (e2e)", () => {
  let app: INestApplication;
  let userModel: typeof User;
  let verifySuccess;
  const user = {
    email: "test@mail.com", 
    password: "$2b$10$28xJRsHjH05F/TIbN76tL.akQT07qqPh6Zu2sac9O2pgOnKuRugyK", 
    phone: "0366033333",
    roleId: 1,
    status: USER_STATUS.ACTIVATED
  };

  const userDeactived = {
    email: "test-deactived@mail.com", 
    phone: "0366033334",
    roleId: 1,
    status: USER_STATUS.DEACTIVED
  };

  const userDeleted = {
    email: "test-deleted@mail.com", 
    phone: "0366033335",
    roleId: 1,
    status: USER_STATUS.ACTIVATED
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    userModel = moduleRef.get("UserRepository");
    await userModel.bulkCreate([user, userDeactived, userDeleted]);
    await userModel.destroy({ where: { email: "test-deleted@mail.com" } });
  });

  afterAll(async () => {
    await userModel.destroy({
      where: {
        [Op.or]: [{ email: { [Op.like]: "test%@mail.com" } }, { phone: '123456789' }],
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
      phone: "0366033335",
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
      phone: "0366033334",
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
