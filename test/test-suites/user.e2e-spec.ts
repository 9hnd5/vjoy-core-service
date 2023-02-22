import { HttpStatus, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "app.module";
import { User } from "entities/user.entity";
import { USER_STATUS } from "modules/users/users.constants";
import * as request from "supertest";
import { generateNumber } from "utils/helpers";
import { expectError, expectErrors, signin } from "../test.util";
import { API_CORE_PREFIX } from "../test.util";

describe("UsersController E2E Test", () => {
  let app: INestApplication;
  let userModel: typeof User;
  let userToken = "";
  let adminToken = "";
  let testUser: {[k: string]: any} = {
    firstname: "testUser",
    lastname: "testUser",
    email: `user-test-${generateNumber(6)}@gmail.com`,
    phone: `${generateNumber(10)}`,
    roleId: 4,
    password: 'fdf324fddsfa@321'
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    userModel = moduleRef.get("UserRepository");
    app = moduleRef.createNestApplication();
    app.enableVersioning();
    app.setGlobalPrefix("api");
    await app.init();

    const { accessToken } = await signin();
    adminToken = accessToken;
  });

  describe("Create new user (POST)api/users", () => {
 
    it("Should succeed due to user sufficient privileges", () => {
      return request(app.getHttpServer())
        .post(`${API_CORE_PREFIX}/users`)
        .send(testUser)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.CREATED)
        .expect((response) => {
          const user = response.body.data;
          testUser = {...testUser, id: user.id};
          
          expect(user.email).toEqual(testUser.email);
          expect(user.roleId).toEqual(testUser.roleId);
          expect(user.firstname).toEqual(testUser.firstname.trim());
          expect(user.lastname).toEqual(testUser.lastname.trim());
          expect(user.status).toEqual(USER_STATUS.ACTIVATED);
          // expect(user).not.toHaveProperty("password");
        });
    });

    it("Should signin successfully and return userToken", () => {
      return request(app.getHttpServer())
        .post(`${API_CORE_PREFIX}/auth/login`)
        .send({ type: "email", email: testUser.email, password: testUser.password })
        .expect(HttpStatus.CREATED)
        .expect((response) => {
          const { accessToken, refreshToken } = response.body.data;
          userToken = accessToken;

          expect(accessToken).not.toBeNull();
          expect(refreshToken).not.toBeNull();
        });
    });

    it("should fail due to user unauthorized", () => {
      return request(app.getHttpServer())
        .post(`${API_CORE_PREFIX}/users`)
        .send(testUser)
        .expect(HttpStatus.UNAUTHORIZED)
        .expect((response: request.Response) => {
          // expectError(response.body);
        });
    });

    it("should fail due to user insufficient privileges", () => {
      return request(app.getHttpServer())
        .post(`${API_CORE_PREFIX}/users`)
        .send(testUser)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN)
        .expect((response: request.Response) => {
          expectError(response.body);
        });
    });
  });

  describe("Update user (PATCH)api/users/:id", () => {
    it("Should fail due to user unauthorized", () => {
      return request(app.getHttpServer())
        .patch(`${API_CORE_PREFIX}/users/${testUser.id}`)
        .expect(HttpStatus.UNAUTHORIZED)
        .expect((response: request.Response) => {
          // expectError(response.body);
        });;
    });

    it("Should fail due to user is not the same", () => {
      return request(app.getHttpServer())
        .patch(`${API_CORE_PREFIX}/users/1`)
        .send(testUser)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN)
        .expect((response: request.Response) => {
          expectError(response.body);
        });
    });

    it("Should failed due to invalid data", () => {
      const updateData = {
        firstname: '', 
        phone: 3423432432,
        id: generateNumber(4)};
      return request(app.getHttpServer())
        .patch(`${API_CORE_PREFIX}/users/${testUser.id}`)
        .send(updateData)
        .set("Authorization", `Bearer ${userToken}`)
        .expect((response) => {
          expectErrors(response.body);
        });
    });

    it("Same user updates optional fields should succeed", () => {
      const updateData = {
        firstname: 'fistname update', 
        lastname: 'last name update',
        id: generateNumber(4),
        roleId: 1 //admin
      };
      return request(app.getHttpServer())
        .patch(`${API_CORE_PREFIX}/users/${testUser.id}`)
        .send(updateData)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.OK)
        .expect((response) => {
          const user = response.body.data;
          expect(user.firstname).toEqual(updateData.firstname.trim());
          expect(user.lastname).toEqual(updateData.lastname.trim());
          expect(user.id).toEqual(testUser.id);
          expect(user.roleId).not.toEqual(testUser.roleId);
          // expect(user).not.toHaveProperty("password");
        });
    });

    it("Same user updates email should succeed & response otpToken", () => {
      const updateData = {email: `user-test-${generateNumber(6)}@gmail.com`};
      return request(app.getHttpServer())
        .patch(`${API_CORE_PREFIX}/users/${testUser.id}`)
        .send(updateData)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.OK)
        .expect((response) => {
          const {otpToken} = response.body.data;
          expect(otpToken).not.toBeNull();
        });
    });

    it("Same user updates phone should succeed & response otpToken", () => {
      const updateData = {phone: `${generateNumber(10)}`};
      return request(app.getHttpServer())
        .patch(`${API_CORE_PREFIX}/users/${testUser.id}`)
        .send(updateData)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.OK)
        .expect((response) => {
          const {otpToken} = response.body.data;
          expect(otpToken).not.toBeNull();
        });
    });

    it("Update phone & firstname should response otpToken & user data", () => {
      const updateData = {
        phone: `${generateNumber(10)}`,
        firstname: 'update firstname'
      };
      return request(app.getHttpServer())
        .patch(`${API_CORE_PREFIX}/users/${testUser.id}`)
        .send(updateData)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.OK)
        .expect((response) => {
          const {otpToken, firstname} = response.body.data;
          expect(otpToken).not.toBeNull();
          expect(firstname).toEqual(updateData.firstname);
        });
    });


    it("Admin update email & phone should response the user data", () => {
      const updateData = {
        firstname: 'first name update', 
        lastname: 'last name update', 
        phone: `${generateNumber(10)}`,
        email: `user-test-${generateNumber(4)}@gmail.com`,
        id: generateNumber(4)
      };
      return request(app.getHttpServer())
        .patch(`${API_CORE_PREFIX}/users/${testUser.id}`)
        .send(updateData)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.OK)
        .expect((response) => {
          const user = response.body.data;
          expect(user.firstname).toEqual(updateData.firstname.trim());
          expect(user.lastname).toEqual(updateData.lastname.trim());
          expect(user.phone).toEqual(updateData.phone);
          expect(user.email).toEqual(updateData.email);
          expect(user.id).toEqual(testUser.id);
          
        });
    });
  });

  describe("Get users (GET)api/users", () => {
    it("should fail due to user unauthorized", () => {
      return request(app.getHttpServer())
        .get(`${API_CORE_PREFIX}/users?page=1&pageSize=10&sort=[["id","ASC"]]`)
        .expect(HttpStatus.UNAUTHORIZED)
        .expect((response: request.Response) => {
          // expectError(response.body);
        });
    });

    it("Should succeed because user having sufficient privileges", () => {
      return request(app.getHttpServer())
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
      return request(app.getHttpServer())
        .get(`${API_CORE_PREFIX}/users?page=1&pageSize=10&sort=[["id","ASC"]]`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN)
        .expect((response: request.Response) => {
          expectError(response.body);
        });
    });
  });

  describe("Get user (GET)api/users/:id", () => {
    it("Should fail due to user unauthorized", () => {
      return request(app.getHttpServer())
        .get(`${API_CORE_PREFIX}/users/${testUser.id}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
    it("Should fail due to user is not the same", () => {
      return request(app.getHttpServer())
        .get(`${API_CORE_PREFIX}/users/1`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should succeed due to user is the same", () => {
      return request(app.getHttpServer())
        .get(`${API_CORE_PREFIX}/users/${testUser.id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.OK)
        .expect((response) => {
          const user = response.body.data;
          expect(user.id).toEqual(testUser.id);
          expect(user).not.toHaveProperty("password");
        });
    });
    it("Should Succeed due to user is admin", () => {
      return request(app.getHttpServer())
        .get(`${API_CORE_PREFIX}/users/${testUser.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.OK)
        .expect((response) => {
          const user = response.body.data;
          expect(user.id).toEqual(testUser.id);
          expect(user).not.toHaveProperty("password");
        });
    });
  });

  describe("Delete user (DELETE)api/users/:id", () => {
    it("Should fail due to user unauthorize", () => {
      return request(app.getHttpServer())
        .delete(`${API_CORE_PREFIX}/users/${testUser.id}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
    
    it("Should fail due to user is not the same", () => {
      return request(app.getHttpServer())
        .get(`${API_CORE_PREFIX}/users/1`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should Succeed due to user having sufficient privileges", () => {
      return request(app.getHttpServer())
        .delete(`${API_CORE_PREFIX}/users/${testUser.id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.OK)
        .expect(async (response) => {
          const user  = await userModel.findByPk(testUser.id, {paranoid: false});
          expect(user?.deletedAt).not.toBeNull();
        });
    });

    it("Same user should soft-delete only", () => {
      return request(app.getHttpServer())
        .delete(`${API_CORE_PREFIX}/users/${testUser.id}?hardDelete=true`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.OK)
        .expect(async (response) => {
          const user  = await userModel.findByPk(testUser.id, {paranoid: false});
          expect(user?.deletedAt).not.toBeNull();
        });
    });
    
    it("Admin should hard-delete", () => {
      return request(app.getHttpServer())
        .delete(`${API_CORE_PREFIX}/users/${testUser.id}?hardDelete=true`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.OK)
        .expect(async (response) => {
          const user  = await userModel.findByPk(testUser.id, {paranoid: false});
          expect(user).toBeNull();
        });
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
