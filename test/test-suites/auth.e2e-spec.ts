import {
  API_CORE_PREFIX,
  API_TOKEN,
  ApiKey,
  ROLE_ID,
  USER_STATUS,
  User,
  createUser,
  expectError,
  generateNumber,
  signin,
} from "@common";
import { HttpStatus, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "app.module";
import { MAX_RESEND_OTP_MINS } from "modules/auth/auth.constants";
import { AuthService } from "modules/auth/auth.service";
import { Op } from "sequelize";
import * as request from "supertest";

describe("Auth (e2e)", () => {
  let app: INestApplication;
  let userModel: typeof User;
  let verifySuccess;
  let adminToken: string;
  let userToken: string;
  let apiKey: ApiKey["dataValues"];
  let agent: request.SuperAgentTest;
  const apiToken = API_TOKEN;
  let user: { [k: string]: any };
  let userDeactived: { [k: string]: any };
  let userDeleted: { [k: string]: any };
  let userCreatedByPhone;
  const password = "abc@123456";

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
    const adminUser = await signin();
    adminToken = adminUser.accessToken;

    //create new user
    const user1 = {
      firstname: "login-test",
      lastname: "login-test",
      email: `login-test-${generateNumber(6)}@vus-etsc.edu.vn`,
      phone: `+849${generateNumber(8)}`,
      roleId: ROLE_ID.PARENT,
      password,
    };

    const user2 = {
      firstname: "login-test-deactived",
      lastname: "login-test-deactived",
      email: `login-test-${generateNumber(6)}@vus-etsc.edu.vn`,
      phone: `+849${generateNumber(8)}`,
      roleId: ROLE_ID.PARENT,
      password,
    };

    const user3 = {
      firstname: "login-test-deleted",
      lastname: "login-test-deleted",
      email: `login-test-${generateNumber(6)}@vus-etsc.edu.vn`,
      phone: `+849${generateNumber(8)}`,
      roleId: ROLE_ID.PARENT,
      password,
    };
    const createdUser1: User["dataValues"] = await createUser({ newUser: user1, accessToken: adminToken });
    const createdUser2: User["dataValues"] = await createUser({ newUser: user2, accessToken: adminToken });
    const createdUser3: User["dataValues"] = await createUser({ newUser: user3, accessToken: adminToken });
    user = { id: createdUser1.id, ...user1 };
    userDeactived = { id: createdUser2.id, ...user2 };
    userDeleted = { id: createdUser3.id, ...user3 };

    userModel = moduleRef.get("UserRepository");
    // deactive user
    await userModel.update({ status: USER_STATUS.DEACTIVED }, { where: { id: userDeactived.id } });
    // soft delete user
    await userModel.destroy({ where: { id: userDeleted.id } });

    // gen success token
    const authService = await moduleRef.resolve(AuthService);
    const otpCode = authService.generateOTPCode();
    const otpToken = await authService.generateOTPToken(otpCode, {
      userId: adminUser.id,
      roleId: adminUser.roleId,
    });
    verifySuccess = { otpCode, otpToken };
  });

  afterAll(async () => {
    //Delete new user was created before
    await userModel.destroy({
      where: {
        [Op.or]: [
          {
            email: {
              [Op.startsWith]: "login-test",
            },
          },
          {
            email: {
              [Op.startsWith]: "APITEST",
            },
          },
        ],
      },
      force: true,
    });

    await app.close();
  });

  describe("Sign-up/Sign-in by phone", () => {
    const data = { phone: `+849${generateNumber(8)}` };

    afterAll(async () => {
      await userModel.destroy({ where: { phone: data.phone }, force: true });
    });

    describe("Sign-up (POST) auth/signup/phone", () => {
      it("Should sign up succeed and return otpToken", () => {
        return agent
          .post(`${API_CORE_PREFIX}/auth/signup/phone`)
          .send(data)
          .expect((res) => {
            const result = res.body.data;
            expect(result).toHaveProperty("otpToken");
          });
      });

      it("Should sign up failed due to phone already exists", () => {
        return agent
          .post(`${API_CORE_PREFIX}/auth/signup/phone`)
          .send(data)
          .expect((res) => expectError(res.body))
          .expect(HttpStatus.BAD_REQUEST);
      });

      it("Should sign up failed due to phone is not valid format VN", () => {
        return agent
          .post(`${API_CORE_PREFIX}/auth/signup/phone`)
          .send({ ...data, phone: "12345" })
          .expect((res) => expectError(res.body))
          .expect(HttpStatus.BAD_REQUEST);
      });
    });

    describe("Resend Otp (POST) auth/resend-otp", () => {
      it("Should failed resend otp after sign-up succeed", async () => {
        return agent
          .post(`${API_CORE_PREFIX}/auth/resend-otp`)
          .send(data)
          .expect((response: request.Response) => {
            expectError(response.body);
          })
          .expect(HttpStatus.BAD_REQUEST);
      });
    });

    describe("Sign-in (POST) auth/signin/phone", () => {
      it("Should sign-in failed due to phone not exist", () => {
        return agent
          .post(`${API_CORE_PREFIX}/auth/signin/phone`)
          .send({ phone: `+849${generateNumber(8)}` })
          .expect((res) => expectError(res.body))
          .expect(HttpStatus.BAD_REQUEST);
      });

      it("Should sign in failed due to phone is not valid format VN", () => {
        return agent
          .post(`${API_CORE_PREFIX}/auth/signin/phone`)
          .send({ ...data, phone: "12345" })
          .expect((res) => expectError(res.body))
          .expect(HttpStatus.BAD_REQUEST);
      });

      it("Should sign in failed due to user deactived", () => {
        return agent
          .post(`${API_CORE_PREFIX}/auth/signin/phone`)
          .send({ phone: userDeactived.phone })
          .expect((response: request.Response) => {
            expectError(response.body);
          })
          .expect(HttpStatus.BAD_REQUEST);
      });
  
      it("Should sign in failed due to user deleted", () => {
        return agent
          .post(`${API_CORE_PREFIX}/auth/signin/phone`)
          .send({ phone: userDeleted.phone })
          .expect((response: request.Response) => {
            expectError(response.body);
          })
          .expect(HttpStatus.BAD_REQUEST);
      });

      it("Should sign-in succeed and return otpToken", async () => {
        // Wait for 1 minute from the last sign-up succeed (otp has sent when sign-up)
        await new Promise(resolve => setTimeout(resolve, MAX_RESEND_OTP_MINS * 60000));

        return agent
          .post(`${API_CORE_PREFIX}/auth/signin/phone`)
          .send(data)
          .expect((res) => {
            const result = res.body.data;
            expect(result).toHaveProperty("otpToken");
          });
      }, MAX_RESEND_OTP_MINS * 65000);
    });
  });

  describe("Sign-in by email (POST) auth/signin/email", () => {
    it("Should sign in successfully and return userToken", () => {
      const data = {
        email: user.email,
        password,
      };
      return agent
        .post(`${API_CORE_PREFIX}/auth/signin/email`)
        .send(data)
        .expect((response: request.Response) => {
          const { email, accessToken } = response.body.data;
          userToken = accessToken;
          expect(email).toEqual(data.email);
          expect(accessToken).not.toBeNull();
        })
        .expect(HttpStatus.CREATED);
    });

    it("Should sign in failed due to user not exist", () => {
      const data = {
        type: "email",
        email: `email-${generateNumber(10)}@vus-etsc.edu.vn`,
        password,
      };

      return agent
        .post(`${API_CORE_PREFIX}/auth/signin/email`)
        .send(data)
        .expect((response: request.Response) => {
          expectError(response.body);
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("Should sign in failed due to wrong password", () => {
      const data = {
        type: "email",
        email: user.email,
        password: `${generateNumber(6)}`,
      };

      return agent
        .post(`${API_CORE_PREFIX}/auth/signin/email`)
        .send(data)
        .expect((response: request.Response) => {
          expectError(response.body);
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("Should sign in failed due to not providing api-key", () => {
      const data = {
        type: "email",
        email: user.email,
        password,
      };
      return request(app.getHttpServer())
        .post(`${API_CORE_PREFIX}/auth/signin/email`)
        .send(data)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe("Sign-up by email (POST) auth/signup/email", () => {
    it("Should sign up failed due to user already exists", () => {
      const data = {
        email: user.email,
        password,
      };

      return agent
        .post(`${API_CORE_PREFIX}/auth/signup/email`)
        .send(data)
        .expect((response: request.Response) => {
          expectError(response.body);
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("Should sign up successfully and return userToken", () => {
      const data = {
        email: `login-test-${generateNumber(6)}@vus-etsc.edu.vn`,
        password,
      };
      return agent
        .post(`${API_CORE_PREFIX}/auth/signup/email`)
        .send(data)
        .expect((response: request.Response) => {
          const { email, accessToken } = response.body.data;
          userToken = accessToken;
          expect(email).toEqual(data.email);
          expect(accessToken).not.toBeNull();
        })
        .expect(HttpStatus.CREATED);
    });

    it("Should sign up failed due to not providing api-key", () => {
      const data = {
        type: "email",
        email: user.email,
        password,
      };
      return request(app.getHttpServer())
        .post(`${API_CORE_PREFIX}/auth/signup/email`)
        .send(data)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe("Sign in by email (POST) auth/login", () => {
    it("Should sign in successfully and return userToken", () => {
      const loginDTO = {
        type: "email",
        email: user.email,
        password,
      };
      return agent
        .post(`${API_CORE_PREFIX}/auth/login`)
        .send(loginDTO)
        .expect((response: request.Response) => {
          const { email, accessToken } = response.body.data;
          userToken = accessToken;
          expect(email).toEqual(loginDTO.email);
          expect(accessToken).not.toBeNull();
        })
        .expect(HttpStatus.CREATED);
    });

    it("Should sign in failed due to user not exist", () => {
      const loginDTO = {
        type: "email",
        email: `email-${generateNumber(10)}@vus-etsc.edu.vn`,
        password,
      };

      return agent
        .post(`${API_CORE_PREFIX}/auth/login`)
        .send(loginDTO)
        .expect((response: request.Response) => {
          expectError(response.body);
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should sign in failed due to wrong password", () => {
      const loginDTO = {
        type: "email",
        email: user.email,
        password: `${generateNumber(6)}`,
      };

      return agent
        .post(`${API_CORE_PREFIX}/auth/login`)
        .send(loginDTO)
        .expect((response: request.Response) => {
          expectError(response.body);
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should sign in failed due to not providing api-key", () => {
      const loginDTO = {
        type: "email",
        email: user.email,
        password,
      };
      return request(app.getHttpServer())
        .post(`${API_CORE_PREFIX}/auth/login`)
        .send(loginDTO)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe("Create new api-key (POST)api/api-key", () => {
    it("should create api-key success due to user is admin", () => {
      const keyData = { name: "APITEST-name", type: "vjoy-web", description: "APITEST-name-description" };
      return agent
        .post(`${API_CORE_PREFIX}/auth/api-key`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(keyData)
        .expect((response: request.Response) => {
          apiKey = response.body.data;

          expect(apiKey.name).toEqual(keyData.name);
          expect(apiKey.type).toEqual(keyData.type);
          expect(apiKey.description).toEqual(keyData.description);
          expect(apiKey).toHaveProperty("apiToken");
        })
        .expect(HttpStatus.CREATED);
    });

    it("should create api-key fail due to user is not admin", () => {
      return agent
        .post(`${API_CORE_PREFIX}/auth/api-key`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ name: "APITEST-name", type: "vjoy-web", description: "APITEST-description" })
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe("Sign in by phone (POST) auth/login", () => {
    it("Should sign in successfully and return otpToken", () => {
      const loginDTO = {
        type: "phone",
        phone: user.phone,
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

    it("Should create new user and return otpToken due to user not exist", () => {
      const loginDTO = {
        type: "phone",
        phone: `${generateNumber(10)}`,
      };

      return agent
        .post(`${API_CORE_PREFIX}/auth/login`)
        .send(loginDTO)
        .expect(async (response: request.Response) => {
          const { data } = response.body;

          userCreatedByPhone = await userModel.findOne({ where: { phone: loginDTO.phone } });
          expect(userCreatedByPhone?.phone).toEqual(loginDTO.phone);
          expect(userCreatedByPhone?.status).toEqual(USER_STATUS.NEW);
          expect(data).toHaveProperty("otpToken");
          expect(data).not.toHaveProperty("otpCode");
        })
        .expect(HttpStatus.CREATED);
    });

    it("Should sign in failed due to user deactived", () => {
      const loginDTO = {
        type: "phone",
        phone: userDeactived.phone,
      };

      return agent
        .post(`${API_CORE_PREFIX}/auth/login`)
        .send(loginDTO)
        .expect((response: request.Response) => {
          expectError(response.body);
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should sign in failed due to user deleted", () => {
      const loginDTO = {
        type: "phone",
        phone: userDeleted.phone,
      };

      return agent
        .post(`${API_CORE_PREFIX}/auth/login`)
        .send(loginDTO)
        .expect((response: request.Response) => {
          expectError(response.body);
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe("Verify Otp (POST) auth/otp", () => {
    it("Should verify successfully and return userToken", () => {
      return agent
        .post(`${API_CORE_PREFIX}/auth/otp`)
        .send(verifySuccess)
        .expect((response: request.Response) => {
          const { accessToken } = response.body.data;
          expect(accessToken).not.toBeNull();
        })
        .expect(HttpStatus.CREATED);
    });

    it("Should verify failed due to invalid otp", () => {
      const verifyDTO = {
        otpToken:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEzLCJyb2xlSWQiOjQsImlhdCI6MTY3NTkzNjkyNywiZXhwIjoxNjc1OTM3MjI3fQ.bH7gCcM73l7drMish8o_h1ALga-gpKtTdL4s5keRyHU",
        otpCode: "8634",
      };

      return agent
        .post(`${API_CORE_PREFIX}/auth/otp`)
        .send(verifyDTO)
        .expect((response: request.Response) => {
          expectError(response.body);
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe("Delete api-key (DELETE)api/api-key", () => {
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
  });
});
