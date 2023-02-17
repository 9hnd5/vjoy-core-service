import { HttpStatus, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "app.module";
import { User } from "entities/user.entity";
import * as request from "supertest";
describe("UsersController E2E Test", () => {
  let app: INestApplication;
  let userToken = "";
  let adminToken = "";
  let user;
  const url = "/api/v1/dev/core";
  let userModel: typeof User;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    userModel = moduleRef.get("UserRepository");
    app = moduleRef.createNestApplication();
    app.enableVersioning();
    app.setGlobalPrefix("api");
    await app.init();
  });

  it("Should signin successfully and return adminToken", () => {
    return request(app.getHttpServer())
      .post(`${url}/auth/login`)
      .send({ type: "email", email: "admin@vus-etsc.edu.vn", password: "admin" })
      .expect(HttpStatus.CREATED)
      .expect((response) => {
        const { data } = response.body;
        adminToken = data.accessToken;
      });
  });

  describe("Create new user (POST)api/users", () => {
    let testUser;
    beforeAll(() => {
      testUser = {
        firstname: "testUser",
        lastname: "testUser",
        email: "testUser@gmail.com",
        phone: "0931336283",
        roleId: 4,
      };
    });

    it("Should succeed due to user sufficient privilleges", () => {
      return request(app.getHttpServer())
        .post(`${url}/users`)
        .send(testUser)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.CREATED)
        .expect((response) => {
          user = response.body.data;
        });
    });

    it("Should signin successfully and return userToken", () => {
      return request(app.getHttpServer())
        .post(`${url}/auth/login`)
        .send({ type: "email", email: user.email, password: "123456" })
        .expect(HttpStatus.CREATED)
        .expect((response) => {
          const { data } = response.body;
          userToken = data.accessToken;
        });
    });

    it("should fail due to user unauthorized", () => {
      return request(app.getHttpServer()).post(`${url}/users`).send(testUser).expect(HttpStatus.UNAUTHORIZED);
    });

    it("should fail due to user insufficient privileges", () => {
      return request(app.getHttpServer())
        .post(`${url}/users`)
        .send(testUser)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe("Update user (PATCH)api/users/:id", () => {
    let testUser = {};
    beforeAll(() => {
      testUser = { ...user, firstname: "testUserUpdate" };
    });
    it("Should fail due to user unauthorized", () => {
      return request(app.getHttpServer()).patch(`${url}/users/${user.id}`).expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should fail due to user is not the same", () => {
      return request(app.getHttpServer())
        .patch(`${url}/users/1`)
        .send(testUser)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should succeed due to user is the same", () => {
      return request(app.getHttpServer())
        .patch(`${url}/users/${user.id}`)
        .send(testUser)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.OK);
    });

    it("Should succeed due to user is admin", () => {
      return request(app.getHttpServer())
        .patch(`${url}/users/${user.id}`)
        .send(testUser)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);
    });
  });

  describe("Get users (GET)api/users", () => {
    it("should fail due to user unauthorized", () => {
      return request(app.getHttpServer()).get(`${url}/users`).expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should succeed because user having sufficient privilleges", () => {
      return request(app.getHttpServer())
        .get(`${url}/users`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect((response) => {
          const { data } = response.body;
          expect(data).toHaveProperty("count");
          expect(data).toHaveProperty("rows");
        });
    });

    it("Should fail due to user lacking sufficient privilleges", () => {
      return request(app.getHttpServer())
        .get(`${url}/users`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe("Get user (GET)api/users/:id", () => {
    it("Should fail due to user unauthorized", () => {
      return request(app.getHttpServer()).get(`${url}/users/${user.id}`).expect(HttpStatus.UNAUTHORIZED);
    });
    it("Should fail due to user is not the same", () => {
      return request(app.getHttpServer())
        .get(`${url}/users/1`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });
    it("Should succeed due to user is the same", () => {
      return request(app.getHttpServer())
        .get(`${url}/users/${user.id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.OK);
    });
    it("Should Succeed due to user is admin", () => {
      return request(app.getHttpServer())
        .get(`${url}/users/${user.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);
    });
  });

  describe("Delete user (DELETE)api/users/:id", () => {
    it("Should fail due to user unauthorize", () => {
      return request(app.getHttpServer()).delete(`${url}/users/${user.id}`).expect(HttpStatus.UNAUTHORIZED);
    });
    it("Should fail due to user lacking sufficient privilleges", () => {
      return request(app.getHttpServer())
        .delete(`${url}/users/${user.id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });
    it("Should Succeed due to user having sufficient privilleges", () => {
      return request(app.getHttpServer())
        .delete(`${url}/users/${user.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);
    });
  });

  afterAll(async () => {
    await userModel.destroy({ where: { email: "testUser@gmail.com" }, force: true });
    await app.close();
  });
});
