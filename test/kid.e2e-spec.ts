import { HttpStatus, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "app.module";
import * as request from "supertest";

jest.setTimeout(10000);
describe("UsersController E2E test", () => {
  let app: INestApplication;
  let userToken = "";
  let adminToken = "";
  let parent;
  let kid;

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

  it("Create new parent (POST)api/users", () => {
    return request(app.getHttpServer())
      .post("/users")
      .send({
        firstname: "testParent",
        lastname: "testParent",
        email: "testParent@gmail.com",
        phone: "0931336273",
        roleId: 1,
      })
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(HttpStatus.CREATED)
      .expect((response) => {
        parent = response.body.data;
      });
  });

  describe("Create kid (POST)api/users/:id/kids", () => {
    it("Should fail due to user unauthorized", () => {
      return request(app.getHttpServer()).post(`/users/${parent.id}/kids`).expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should fail due to user lacking sufficient privilleges", () => {
      return request(app.getHttpServer())
        .post(`/users/${parent.id}/kids`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should succeed due to user having sufficient privilleges", () => {
      return request(app.getHttpServer())
        .post(`/users/${parent.id}/kids`)
        .send({ firstname: "test", lastname: "test", dob: "2022-02-02", gender: "M", roleId: 1, parentId: parent.id })
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.CREATED)
        .expect((response) => {
          kid = response.body.data;
        });
    });
  });

  describe("Get kids (GET)api/kids", () => {
    it("Should fail due to user unauthorized", () => {
      return request(app.getHttpServer()).get("/kids").expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should fail due to user lacking sufficient privilleges", () => {
      return request(app.getHttpServer())
        .get("/kids")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should suceed due to user having sufficient privilleges", () => {
      return request(app.getHttpServer())
        .get("/kids")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);
    });
  });

  describe("Get one kid (GET)api/users/:userId/kids/:kidId", () => {
    it("Should fail due to user unauthorized", () => {
      return request(app.getHttpServer()).get(`/users/${parent.id}/kids/${kid.id}/`).expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should fail due to user lacking sufficient privilleges", () => {
      return request(app.getHttpServer())
        .get(`/users/${parent.id}/kids/${kid.id}/`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should suceed due to user having sufficient privilleges", () => {
      return request(app.getHttpServer())
        .get(`/users/${parent.id}/kids/${kid.id}/`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);
    });
  });

  describe("Get kids by parent (GET)api/users/:userId/kids", () => {
    it("Should fail due to user unauthorized", () => {
      return request(app.getHttpServer()).get(`/users/${parent.id}/kids`).expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should fail due to user lacking sufficient privilleges", () => {
      return request(app.getHttpServer())
        .get(`/users/${parent.id}/kids`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should suceed due to user having sufficient privilleges", () => {
      return request(app.getHttpServer())
        .get(`/users/${parent.id}/kids`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);
    });
  });

  describe("Delete kid (DELETE)api/kids/:id", () => {
    it("Should fail due to user unauthorized", () => {
      return request(app.getHttpServer()).delete(`/kids/${kid.id}`).expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should fail due to user lacking sufficient privilleges", () => {
      return request(app.getHttpServer())
        .delete(`/kids/${kid.id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should succeed due to user having sufficient privilleges", () => {
      return request(app.getHttpServer())
        .delete(`/kids/${kid.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);
    });
  });

  it("Should delete user successfully and return status 200", () => {
    return request(app.getHttpServer())
      .delete(`/users/${parent.id}`)
      .send()
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(HttpStatus.OK);
  });

  afterAll(async () => {
    await app.close();
  });
});
