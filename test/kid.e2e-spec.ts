import { HttpStatus, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "app.module";
import { User } from "entities/user.entity";
import * as request from "supertest";

describe("KidsController E2E Test", () => {
  let app: INestApplication;
  let userToken = "";
  let adminToken = "";
  let parent;
  let kid;
  let userModel: typeof User;
  const url = "/api/v1/dev/core";

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

  it("Create new parent (POST)api/users", () => {
    return request(app.getHttpServer())
      .post(`${url}/users`)
      .send({
        firstname: "testParent",
        lastname: "testParent",
        email: "testParent@gmail.com",
        phone: "0931336273",
        roleId: 4,
      })
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(HttpStatus.CREATED)
      .expect((response) => {
        parent = response.body.data;
      });
  });

  it("Should signin successfully and return userToken", () => {
    return request(app.getHttpServer())
      .post(`${url}/auth/login`)
      .send({ type: "email", email: parent.email, password: "123456" })
      .expect(HttpStatus.CREATED)
      .expect((response) => {
        const { data } = response.body;
        userToken = data.accessToken;
      });
  });

  describe("Create kid (POST)api/users/:id/kids", () => {
    let testData = {};
    beforeAll(() => {
      testData = {
        firstname: "testKid",
        lastname: "testKid",
        dob: "2022-02-02",
        gender: "M",
        roleId: 1,
        parentId: parent?.id,
      };
    });
    it("Should fail due to user unauthorized", () => {
      return request(app.getHttpServer()).post(`${url}/users/${parent.id}/kids`).expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should fail due to user is not the same", () => {
      return request(app.getHttpServer())
        .post(`${url}/users/1/kids`)
        .send(testData)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should succeed due to user is the same", () => {
      return request(app.getHttpServer())
        .post(`${url}/users/${parent.id}/kids`)
        .send(testData)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.CREATED)
        .expect((res) => (kid = res.body.data));
    });

    it("Should succeed due to user is admin", () => {
      return request(app.getHttpServer())
        .post(`${url}/users/${parent.id}/kids`)
        .send(testData)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.CREATED)
        .expect((res) => (kid = res.body.data));
    });
  });

  describe("Update kid (PATCH)api/users/:id/kids", () => {
    let testKid = {};
    beforeAll(() => {
      testKid = { ...kid, firstname: "testKidUpdate" };
    });
    it("Should fail due to user unauthorized", () => {
      return request(app.getHttpServer())
        .patch(`${url}/users/${parent.id}/kids/${kid.id}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should fail due to user is not the same", () => {
      return request(app.getHttpServer())
        .patch(`${url}/users/1/kids/${kid.id}`)
        .send(testKid)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should succeed due to user is the same", () => {
      return request(app.getHttpServer())
        .patch(`${url}/users/${parent.id}/kids/${kid.id}`)
        .send(testKid)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.OK);
    });

    it("Should succeed due to user is admin", () => {
      return request(app.getHttpServer())
        .patch(`${url}/users/${parent.id}/kids/${kid.id}`)
        .send(testKid)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);
    });
  });

  describe("Get kids (GET)api/kids", () => {
    it("Should fail due to user unauthorized", () => {
      return request(app.getHttpServer()).get(`${url}/kids`).expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should fail due to user lacking sufficient privilleges", () => {
      return request(app.getHttpServer())
        .get(`${url}/kids`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should suceed due to user having sufficient privilleges", () => {
      return request(app.getHttpServer())
        .get(`${url}/kids`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);
    });
  });

  describe("Get one kid (GET)api/users/:userId/kids/:kidId", () => {
    it("Should fail due to user unauthorized", () => {
      return request(app.getHttpServer())
        .get(`${url}/users/${parent.id}/kids/${kid.id}/`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should fail due to user is not the same", () => {
      return request(app.getHttpServer())
        .get(`${url}/users/1/kids/${kid.id}/`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should succeed due to user is the same", () => {
      return request(app.getHttpServer())
        .get(`${url}/users/${parent.id}/kids/${kid.id}/`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.OK);
    });

    it("Should succeed due to user is admin", () => {
      return request(app.getHttpServer())
        .get(`${url}/users/${parent.id}/kids/${kid.id}/`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);
    });
  });

  describe("Get kids by parent (GET)api/users/:userId/kids", () => {
    it("Should fail due to user unauthorized", () => {
      return request(app.getHttpServer()).get(`${url}/users/${parent.id}/kids`).expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should fail due to user is not the same", () => {
      return request(app.getHttpServer())
        .get(`${url}/users/1/kids`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should succeed due to user is the same", () => {
      return request(app.getHttpServer())
        .get(`${url}/users/${parent.id}/kids`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.OK);
    });

    it("Should succeed due to user is admin", () => {
      return request(app.getHttpServer())
        .get(`${url}/users/${parent.id}/kids`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);
    });
  });

  describe("Delete kid (DELETE)api/kids/:id", () => {
    it("Should fail due to user unauthorized", () => {
      return request(app.getHttpServer()).delete(`${url}/kids/${kid.id}`).expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should fail due to user lacking sufficient privilleges", () => {
      return request(app.getHttpServer())
        .delete(`${url}/kids/${kid.id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should succeed due to user having sufficient privilleges", () => {
      return request(app.getHttpServer())
        .delete(`${url}/kids/${kid.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);
    });
  });

  afterAll(async () => {
    await userModel.destroy({ where: { email: parent.email }, force: true });
    await app.close();
  });
});
