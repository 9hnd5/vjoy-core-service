import { HttpStatus, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "app.module";
import * as request from "supertest";
jest.setTimeout(10000);
describe("User e2e", () => {
  let app: INestApplication;
  let userToken = "";
  let adminToken = "";
  let user;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  it("Should signin successfully and return userToken", () => {
    const loginDTO = {
      type: "email",
      email: "test@gmail.com",
      password: "123456",
    };
    return request(app.getHttpServer())
      .post("/auth/login")
      .send(loginDTO)
      .expect(HttpStatus.CREATED)
      .expect((response) => {
        const { data } = response.body;
        userToken = data.accessToken;
      });
  });

  it("Should signin successfully and return adminToken", () => {
    const loginDTO = {
      type: "email",
      email: "admin@gmail.com",
      password: "123456",
    };
    return request(app.getHttpServer())
      .post("/auth/login")
      .send(loginDTO)
      .expect(HttpStatus.CREATED)
      .expect((response) => {
        const { data } = response.body;
        adminToken = data.accessToken;
      });
  });

  describe("Create new user (POST)api/users", () => {
    it("should fail due to user unauthorized", () => {
      return request(app.getHttpServer())
        .post("/users")
        .send(user)
        .set("Content-Type", "application/json")
        .set("Accept", "application/json")
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it("should fail due to user insufficient privileges", () => {
      return request(app.getHttpServer())
        .post("/users")
        .send(user)
        .set("Content-Type", "application/json")
        .set("Accept", "application/json")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should succeed due to user sufficient privilleges", () => {
      return request(app.getHttpServer())
        .post("/users")
        .send({
          firstname: "testUser",
          lastname: "testUser",
          email: "testUser@gmail.com",
          phone: "0931336273",
          roleId: 1,
        })
        .set("Content-Type", "application/json")
        .set("Accept", "application/json")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.CREATED)
        .expect((response) => {
          user = response.body.data;
        });
    });
  });

  describe("Get users (GET)api/users", () => {
    it("should fail due to user unauthorized", () => {
      return request(app.getHttpServer()).get("/users").expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should succeed because user having sufficient privilleges", () => {
      return request(app.getHttpServer())
        .get("/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect((response) => {
          const { data } = response.body;
          expect(data).toHaveProperty("count");
          expect(data).toHaveProperty("rows");
        });
    });

    it("Should fail due to user lacking sufficient privilleges", () => {
      return request(app.getHttpServer())
        .get("/users")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe("Get user (GET)api/users/:id", () => {
    it("Should fail due to user unauthorized", () => {
      return request(app.getHttpServer()).get(`/users/${user.id}`).expect(HttpStatus.UNAUTHORIZED);
    });
    it("Should fail due to user lacking sufficient privilleges", () => {
      return request(app.getHttpServer())
        .get(`/users/${user.id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });
    it("Should Succeed due to user having sufficient privilleges", () => {
      return request(app.getHttpServer())
        .get(`/users/${user.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);
    });
  });

  describe("Delete user (DELETE)api/users/:id", () => {
    it("Should fail due to user unauthorize", () => {
      return request(app.getHttpServer()).delete(`/users/${user.id}`).expect(HttpStatus.UNAUTHORIZED);
    });
    it("Should fail due to user lacking sufficient privilleges", () => {
      return request(app.getHttpServer())
        .delete(`/users/${user.id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });
    it("Should Succeed due to user having sufficient privilleges", () => {
      return request(app.getHttpServer())
        .delete(`/users/${user.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
