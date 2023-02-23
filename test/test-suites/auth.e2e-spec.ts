import { HttpStatus, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "app.module";
import { ApiKey } from "entities/api-key.entity";
import { User } from "entities/user.entity";
import { AuthService } from "modules/auth/auth.service";
import { USER_STATUS } from "modules/users/users.constants";
import { Op } from "sequelize";
import * as request from "supertest";
import { API_CORE_PREFIX, API_TOKEN, createUser, deleteUser, signin } from "../test.util";

describe("Auth (e2e)", () => {
  let app: INestApplication;
  let userModel: typeof User;
  let verifySuccess;
  let adminToken: string;
  let userToken: string;
  let newUser: User["dataValues"];
  let apiKey: ApiKey["dataValues"];
  let agent: request.SuperAgentTest;
  const apiToken = API_TOKEN;
  const user = {
    email: "api-test@vus-etsc.edu.vn",
    password: "$2b$10$28xJRsHjH05F/TIbN76tL.akQT07qqPh6Zu2sac9O2pgOnKuRugyK",
    phone: "0366033333",
    roleId: 1,
    status: USER_STATUS.ACTIVATED,
  };

  const userDeactived = {
    email: "api-test-deactived@vus-etsc.edu.vn",
    phone: "0366033334",
    roleId: 1,
    status: USER_STATUS.DEACTIVED,
  };

  const userDeleted = {
    email: "api-test-deleted@vus-etsc.edu.vn",
    phone: "0366033335",
    roleId: 1,
    status: USER_STATUS.ACTIVATED,
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.enableVersioning();
    app.setGlobalPrefix("api");
    await app.init();
    agent = request.agent(app.getHttpServer());
    agent.set("api-token", apiToken);
    //signin as admin
    const result1 = await signin();
    adminToken = result1.accessToken;

    //create new user
    newUser = await createUser({ accessToken: adminToken });
    //sigin with new user;
    const result2 = await signin({ email: newUser.email!, password: "123456" });
    userToken = result2.accessToken;

    userModel = moduleRef.get("UserRepository");
    await userModel.bulkCreate([user, userDeactived, userDeleted]);
    await userModel.destroy({ where: { email: "api-test-deleted@vus-etsc.edu.vn" } });

    const authService = moduleRef.get(AuthService);
    const otpCode = authService.generateOTPCode();
    const otpToken = await authService.generateOTPToken(otpCode, { userId: 1, roleId: 1 });
    verifySuccess = { otpCode, otpToken };
  });

  afterAll(async () => {
    await userModel.destroy({
      where: {
        [Op.or]: [{ email: { [Op.like]: "api-test%@vus-etsc.edu.vn" } }, { phone: "123456789" }],
      },
      force: true,
    });

    //Delete new user was created before
    await deleteUser({ id: newUser.id, accessToken: adminToken });

    await app.close();
  });

  it("should create api-key success due to user is admin", () => {
    return agent
      .post(`${API_CORE_PREFIX}/auth/api-key`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "APITEST-name", type: "vjoy-web", description: "APITEST-name-description" })
      .expect((res) => (apiKey = res.body.data))
      .expect(HttpStatus.CREATED);
  });

  it("should create api-key fail due to user is not admin", () => {
    return agent
      .post(`${API_CORE_PREFIX}/auth/api-key`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "APITEST-name", type: "vjoy-web", description: "APITEST-description" })
      .expect(HttpStatus.FORBIDDEN);
  });

  it("should delete api-key success due to user is admin", () => {
    return agent
      .delete(`${API_CORE_PREFIX}/auth/api-key/${apiKey.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(HttpStatus.OK);
  });

  it("should delete api-key fail due to user is not admin", () => {
    return agent
      .delete(`${API_CORE_PREFIX}/auth/api-key/${apiKey.id}`)
      .set("Authorization", `Bearer ${userToken}`)
      .expect(HttpStatus.FORBIDDEN);
  });

  it("/auth/login (POST by email)", () => {
    const loginDTO = {
      type: "email",
      email: user.email,
      password: "123456",
    };

    return agent
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

    return agent
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

    return agent
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

    return agent
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

    return agent
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

    return agent
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

    return agent
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
    return agent
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

    return agent
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
