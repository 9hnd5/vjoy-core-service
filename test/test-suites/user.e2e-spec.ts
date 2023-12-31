import {
  API_CORE_PREFIX,
  API_TOKEN,
  expectError,
  expectErrors,
  generateNumber,
  ROLE_ID,
  signin,
  User,
  USER_STATUS,
} from "@common";
import { HttpStatus, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "app.module";
import { AuthService } from "modules/auth/auth.service";
import * as request from "supertest";

describe("UserController E2E Test", () => {
  let app: INestApplication;
  let userModel: typeof User;
  let auService: AuthService;
  let userToken = "";
  let adminToken = "";
  let agent: request.SuperAgentTest;
  const apiToken = API_TOKEN;
  let testUser: { [k: string]: any } = {
    firstname: "testUser",
    lastname: "testUser",
    email: `user-test-${generateNumber(6)}@gmail.com`,
    phone: `+849${generateNumber(8)}`,
    roleId: ROLE_ID.PARENT,
    password: "abc@123456",
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    userModel = moduleRef.get("UserRepository");
    auService = moduleRef.get(AuthService);
    app = moduleRef.createNestApplication();
    app.enableVersioning();
    app.setGlobalPrefix("api");
    await app.init();
    agent = request.agent(app.getHttpServer());
    agent.set("api-token", apiToken);
    const { accessToken } = await signin();
    adminToken = accessToken;
  });

  describe("Create new user (POST)api/users", () => {
    it("Should succeed due to user sufficient privileges", () => {
      return agent
        .post(`${API_CORE_PREFIX}/users`)
        .send(testUser)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect((response) => {
          const user = response.body.data;
          testUser = { ...testUser, id: user.id };

          expect(user.email).toEqual(testUser.email);
          expect(user.roleId).toEqual(testUser.roleId);
          expect(user.firstname).toEqual(testUser.firstname.trim());
          expect(user.lastname).toEqual(testUser.lastname.trim());
          expect(user.status).toEqual(USER_STATUS.ACTIVATED);
          expect(user).not.toHaveProperty("password");
        })
        .expect(HttpStatus.CREATED);
    });

    it("Should signin successfully and return userToken", () => {
      return agent
        .post(`${API_CORE_PREFIX}/auth/signin/email`)
        .send({ email: testUser.email, password: testUser.password })
        .expect((response) => {
          const { accessToken, refreshToken } = response.body.data;
          userToken = accessToken;

          expect(accessToken).not.toBeNull();
          expect(refreshToken).not.toBeNull();
        })
        .expect(HttpStatus.CREATED);
    });

    it("should fail due to user unauthorized", () => {
      return agent
        .post(`${API_CORE_PREFIX}/users`)
        .send(testUser)
        .expect((response: request.Response) => {
          expectError(response.body);
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it("should fail due to user insufficient privileges", () => {
      return agent
        .post(`${API_CORE_PREFIX}/users`)
        .send(testUser)
        .set("Authorization", `Bearer ${userToken}`)
        .expect((response: request.Response) => {
          expectError(response.body);
        })
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe("Update user (PATCH)api/users/:id", () => {
    it("Should fail due to user unauthorized", () => {
      return agent
        .patch(`${API_CORE_PREFIX}/users/${testUser.id}`)
        .expect((response: request.Response) => {
          expectError(response.body);
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should fail due to user is not the same", () => {
      return agent
        .patch(`${API_CORE_PREFIX}/users/1`)
        .send(testUser)
        .set("Authorization", `Bearer ${userToken}`)
        .expect((response: request.Response) => {
          expectError(response.body);
        })
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should failed due to invalid data", () => {
      const updateData = {
        firstname: "",
        phone: 3423432432,
      };
      return agent
        .patch(`${API_CORE_PREFIX}/users/${testUser.id}`)
        .send(updateData)
        .set("Authorization", `Bearer ${userToken}`)
        .expect((response) => {
          expectErrors(response.body);
        });
    });

    it("Should failed due to invalid data (exist id)", () => {
      const updateData = {
        phone: 3423432432,
        id: generateNumber(4),
      };
      return agent
        .patch(`${API_CORE_PREFIX}/users/${testUser.id}`)
        .send(updateData)
        .set("Authorization", `Bearer ${userToken}`)
        .expect((response) => {
          expect(response.body.data.id).not.toBe(updateData.id);
        });
    });

    it("Should failed due to kid not found", () => {
      const updateData = {
        kidName: "kid name update",
      };
      return agent
        .patch(`${API_CORE_PREFIX}/users/${testUser.id}`)
        .send(updateData)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it("Same user updates should response user data", async () => {
      const createdKid: User["dataValues"] = await userModel.create({
        roleId: ROLE_ID.KID_FREE,
        parentId: testUser.id,
        status: USER_STATUS.ACTIVATED,
      });

      const updateData = {
        firstname: "update firstname",
        lastname: "last name update",
        phone: `${generateNumber(10)}`,
        email: `user-test-${generateNumber(4)}@gmail.com`,
        kidName: "kid name update",
        passcode: "2023",
      };
      return agent
        .patch(`${API_CORE_PREFIX}/users/${testUser.id}`)
        .send(updateData)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(async (response) => {
          const user = response.body.data;
          expect(user.firstname).toEqual(updateData.firstname);
          expect(user.lastname).toEqual(updateData.lastname.trim());
          expect(user.phone).toEqual(updateData.phone);
          expect(user.email).toEqual(updateData.email);
          expect(user.passcode).toEqual(updateData.passcode);

          const kid = await userModel.findByPk(createdKid.id);
          expect(kid?.firstname).toEqual(updateData.kidName.trim());

          await userModel.destroy({ where: { id: createdKid.id }, force: true });
        })
        .expect(HttpStatus.OK);
    });

    it("Admin update email & phone should response the user data", () => {
      const updateData = {
        firstname: "first name update",
        lastname: "last name update",
        phone: `${generateNumber(10)}`,
        email: `user-test-${generateNumber(4)}@gmail.com`,
      };
      return agent
        .patch(`${API_CORE_PREFIX}/users/${testUser.id}`)
        .send(updateData)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect((response) => {
          const user = response.body.data;
          expect(user.firstname).toEqual(updateData.firstname.trim());
          expect(user.lastname).toEqual(updateData.lastname.trim());
          expect(user.phone).toEqual(updateData.phone);
          expect(user.email).toEqual(updateData.email);
          expect(user.id).toEqual(testUser.id);
        })
        .expect(HttpStatus.OK);
    });
  });

  describe("Get users (GET)api/users", () => {
    it("should fail due to user unauthorized", () => {
      return agent
        .get(`${API_CORE_PREFIX}/users?page=1&pageSize=10&sort=[["id","ASC"]]`)
        .expect((response: request.Response) => {
          expectError(response.body);
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should succeed because user having sufficient privileges", () => {
      return agent
        .get(`${API_CORE_PREFIX}/users?page=1&pageSize=10&sort=[["id","ASC"]]`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect((response) => {
          const { data } = response.body;
          expect(data.count).toBeGreaterThan(0);
          if (data.count >= 10) {
            expect(data.rows.length).toEqual(10);
          } else {
            expect(data.rows.length).toEqual(data.count);
          }
        });
    });

    it("Should fail due to user lacking sufficient privileges", () => {
      return agent
        .get(`${API_CORE_PREFIX}/users?page=1&pageSize=10&sort=[["id","ASC"]]`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect((response: request.Response) => {
          expectError(response.body);
        })
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe("Get user (GET)api/users/:id", () => {
    it("Should fail due to user unauthorized", () => {
      return agent.get(`${API_CORE_PREFIX}/users/${testUser.id}`).expect(HttpStatus.UNAUTHORIZED);
    });
    it("Should fail due to user is not the same", () => {
      return agent
        .get(`${API_CORE_PREFIX}/users/1`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should succeed due to user is the same", () => {
      return agent
        .get(`${API_CORE_PREFIX}/users/${testUser.id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect((response) => {
          const user = response.body.data;
          expect(user.id).toEqual(testUser.id);
          expect(user).not.toHaveProperty("password");
        })
        .expect(HttpStatus.OK);
    });
    it("Should Succeed due to user is admin", () => {
      return agent
        .get(`${API_CORE_PREFIX}/users/${testUser.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect((response) => {
          const user = response.body.data;
          expect(user.id).toEqual(testUser.id);
          expect(user).not.toHaveProperty("password");
        })
        .expect(HttpStatus.OK);
    });
  });

  describe("Change user password (PATCH)api/users/:id/password", () => {
    it("should fail due to account was deleted", async () => {
      const user = (await userModel.findByPk(testUser.id)) as User;
      await user.destroy();
      return agent
        .patch(`${API_CORE_PREFIX}/users/password`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ oldPassword: "oldPassword", newPassword: "newPassword" })
        .expect((res) => expectError(res.body))
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should fail due to account was deactivated", async () => {
      const user = (await userModel.findByPk(testUser.id, { paranoid: false })) as User;
      await user.restore();
      await user.update({ status: USER_STATUS.DEACTIVED });
      return agent
        .patch(`${API_CORE_PREFIX}/users/password`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ oldPassword: "oldPassword", newPassword: "newPassword" })
        .expect((res) => expectError(res.body))
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should fail due to user.password is not empty and the old password is incorrect", async () => {
      return agent
        .patch(`${API_CORE_PREFIX}/users/password`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ oldPassword: "wrongPassword", newPassword: "newPassword" })
        .expect((res) => expectError(res.body))
        .expect(async () => {
          const user = await userModel.findByPk(testUser.id);
          const isMatch = await auService.comparePassword("newPassword", user?.password || "");
          expect(isMatch).toBe(false);
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should succeed due to user.password is empty", async () => {
      const user = (await userModel.findByPk(testUser.id)) as User;
      user.update({
        password: null as any,
        status: USER_STATUS.ACTIVATED,
      });
      return agent
        .patch(`${API_CORE_PREFIX}/users/password`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ newPassword: "newPassword" })
        .expect(async () => {
          const user = await userModel.findByPk(testUser.id);
          const isMatch = await auService.comparePassword("newPassword", user?.password || "");
          expect(isMatch).toBe(true);
        })
        .expect(HttpStatus.OK);
    });

    it("should succeed due to user.password is not empty and the old password is correct", async () => {
      return agent
        .patch(`${API_CORE_PREFIX}/users/password`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ oldPassword: "newPassword", newPassword: "newPassword" })
        .expect(async () => {
          const user = await userModel.findByPk(testUser.id);
          const isMatch = await auService.comparePassword("newPassword", user?.password || "");
          expect(isMatch).toBe(true);
        })
        .expect(HttpStatus.OK);
    });
  });

  describe("Delete user (DELETE)api/users/:id", () => {
    it("Should fail due to user unauthorize", () => {
      return agent.delete(`${API_CORE_PREFIX}/users/${testUser.id}`).expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should fail due to user is not the same", () => {
      return agent
        .get(`${API_CORE_PREFIX}/users/1`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should Succeed due to user having sufficient privileges", () => {
      return agent
        .delete(`${API_CORE_PREFIX}/users/${testUser.id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(async (response) => {
          const user = await userModel.findByPk(testUser.id, { paranoid: false });
          expect(user?.deletedAt).not.toBeNull();
        })
        .expect(HttpStatus.OK);
    });

    it("Same user should soft-delete only", () => {
      return agent
        .delete(`${API_CORE_PREFIX}/users/${testUser.id}?hardDelete=true`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(async (response) => {
          const user = await userModel.findByPk(testUser.id, { paranoid: false });
          expect(user?.deletedAt).not.toBeNull();
        })
        .expect(HttpStatus.OK);
    });

    it("Admin should hard-delete", () => {
      return agent
        .delete(`${API_CORE_PREFIX}/users/${testUser.id}?hardDelete=true`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(async (response) => {
          const user = await userModel.findByPk(testUser.id, { paranoid: false });
          expect(user).toBeNull();
        })
        .expect(HttpStatus.OK);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
