import { HttpStatus, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "app.module";
import { User } from "entities/user.entity";
import * as request from "supertest";
import { API_TOKEN, signin } from "../test.util";
import { API_CORE_PREFIX } from "../test.util";

describe("KidsController E2E Test", () => {
  let app: INestApplication;
  let userToken = "";
  let adminToken = "";
  let parent;
  let kidAdmin;
  let kidUser;
  const apiToken = API_TOKEN;
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

    const { accessToken } = await signin();
    adminToken = accessToken;
  });

  it("Create new parent (POST)api/users", () => {
    return request(app.getHttpServer())
      .post(`${API_CORE_PREFIX}/users`)
      .set("api-token", `${apiToken}`)
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
      .post(`${API_CORE_PREFIX}/auth/login`)
      .set("api-token", `${apiToken}`)
      .send({ type: "email", email: parent.email, password: "123456" })
      .expect(HttpStatus.CREATED)
      .expect((response) => {
        const { data } = response.body;
        userToken = data.accessToken;
      });
  });

  describe("Create kid (POST)api/users/:id/kids", () => {
    let testAdmin = {};
    let testUser = {};
    beforeAll(() => {
      testAdmin = {
        firstname: "test-admin",
        lastname: "api",
        dob: "2022-02-02",
        gender: "M",
        roleId: 1,
        parentId: parent?.id,
      };
      testUser = {
        firstname: "test-user",
        ...testAdmin,
      };
    });
    it("Should fail due to user unauthorized", () => {
      return request(app.getHttpServer())
        .post(`${API_CORE_PREFIX}/users/${parent.id}/kids`)
        .set("api-token", `${apiToken}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should fail due to user is not the same", () => {
      return request(app.getHttpServer())
        .post(`${API_CORE_PREFIX}/users/1/kids`)
        .set("api-token", `${apiToken}`)
        .send(testUser)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should succeed due to user is the same", () => {
      return request(app.getHttpServer())
        .post(`${API_CORE_PREFIX}/users/${parent.id}/kids`)
        .set("api-token", `${apiToken}`)
        .send(testUser)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.CREATED)
        .expect((res) => (kidUser = res.body.data));
    });

    it("Should succeed due to user is admin", () => {
      return request(app.getHttpServer())
        .post(`${API_CORE_PREFIX}/users/${parent.id}/kids`)
        .set("api-token", `${apiToken}`)
        .send(testAdmin)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.CREATED)
        .expect((res) => (kidAdmin = res.body.data));
    });
  });

  describe("Update kid (PATCH)api/users/:id/kids", () => {
    let testKid = {};
    beforeAll(() => {
      testKid = { ...kidUser, firstname: "test-user-update" };
    });
    it("Should fail due to user unauthorized", () => {
      return request(app.getHttpServer())
        .patch(`${API_CORE_PREFIX}/users/${parent.id}/kids/${kidUser.id}`)
        .set("api-token", `${apiToken}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should fail due to user is not the same", () => {
      return request(app.getHttpServer())
        .patch(`${API_CORE_PREFIX}/users/1/kids/${kidUser.id}`)
        .set("api-token", `${apiToken}`)
        .send(testKid)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should succeed due to user is the same", () => {
      return request(app.getHttpServer())
        .patch(`${API_CORE_PREFIX}/users/${parent.id}/kids/${kidUser.id}`)
        .set("api-token", `${apiToken}`)
        .send(testKid)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.OK);
    });

    it("Should succeed due to user is admin", () => {
      return request(app.getHttpServer())
        .patch(`${API_CORE_PREFIX}/users/${parent.id}/kids/${kidUser.id}`)
        .set("api-token", `${apiToken}`)
        .send(testKid)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);
    });
  });

  describe("Get kids (GET)api/kids", () => {
    it("Should fail due to user unauthorized", () => {
      return request(app.getHttpServer())
        .get(`${API_CORE_PREFIX}/kids?page=1&pageSize=10&sort=[["id","ASC"]]`)
        .set("api-token", `${apiToken}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should fail due to user lacking sufficient privileges", () => {
      return request(app.getHttpServer())
        .get(`${API_CORE_PREFIX}/kids?page=1&pageSize=10&sort=[["id","ASC"]]`)
        .set("api-token", `${apiToken}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should succeed due to user having sufficient privileges", () => {
      return request(app.getHttpServer())
        .get(`${API_CORE_PREFIX}/kids?page=1&pageSize=10&sort=[["id","ASC"]]`)
        .set("api-token", `${apiToken}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.OK)
        .expect((response) => {
          const { data } = response.body;
          expect(data.rows.length).toEqual(10);
        });
    });
  });

  describe("Get one kid (GET)api/users/:userId/kids/:kidId", () => {
    it("Should fail due to user unauthorized", () => {
      return request(app.getHttpServer())
        .get(`${API_CORE_PREFIX}/users/${parent.id}/kids/${kidUser.id}/`)
        .set("api-token", `${apiToken}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should fail due to user is not the same", () => {
      return request(app.getHttpServer())
        .get(`${API_CORE_PREFIX}/users/1/kids/${kidUser.id}/`)
        .set("api-token", `${apiToken}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should succeed due to user is the same", () => {
      return request(app.getHttpServer())
        .get(`${API_CORE_PREFIX}/users/${parent.id}/kids/${kidUser.id}/`)
        .set("api-token", `${apiToken}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.OK);
    });

    it("Should succeed due to user is admin", () => {
      return request(app.getHttpServer())
        .get(`${API_CORE_PREFIX}/users/${parent.id}/kids/${kidUser.id}/`)
        .set("api-token", `${apiToken}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);
    });
  });

  describe("Get kids by parent (GET)api/users/:userId/kids", () => {
    it("Should fail due to user unauthorized", () => {
      return request(app.getHttpServer())
        .get(`${API_CORE_PREFIX}/users/${parent.id}/kids?page=1&pageSize=10&sort=[["id","ASC"]]`)
        .set("api-token", `${apiToken}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should fail due to user is not the same", () => {
      return request(app.getHttpServer())
        .get(`${API_CORE_PREFIX}/users/1/kids?page=1&pageSize=10&sort=[["id","ASC"]]`)
        .set("api-token", `${apiToken}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should succeed due to user is the same", () => {
      return request(app.getHttpServer())
        .get(`${API_CORE_PREFIX}/users/${parent.id}/kids?page=1&pageSize=10&sort=[["id","ASC"]]`)
        .set("api-token", `${apiToken}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.OK);
    });

    it("Should succeed due to user is admin", () => {
      return request(app.getHttpServer())
        .get(`${API_CORE_PREFIX}/users/${parent.id}/kids?page=1&pageSize=10&sort=[["id","ASC"]]`)
        .set("api-token", `${apiToken}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);
    });
  });

  describe("Delete kid (DELETE)api/users/:userId/kids/:id", () => {
    it("Should fail due to user unauthorized", () => {
      return request(app.getHttpServer())
        .delete(`${API_CORE_PREFIX}/users/${parent.id}/kids/${kidUser.id}`)
        .set("api-token", `${apiToken}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should succeed due to user having sufficient privileges", () => {
      return request(app.getHttpServer())
        .delete(`${API_CORE_PREFIX}/users/${parent.id}/kids/${kidUser.id}`)
        .set("api-token", `${apiToken}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.OK);
    });

    it("Should succeed due to user having sufficient privileges (Hard delete)", () => {
      return request(app.getHttpServer())
        .delete(`${API_CORE_PREFIX}/users/${parent.id}/kids/${kidUser.id}?hardDelete=true`)
        .set("api-token", `${apiToken}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);
    });

    it("Should succeed due to user having sufficient privileges (Hard delete)", () => {
      return request(app.getHttpServer())
        .delete(`${API_CORE_PREFIX}/users/${parent.id}/kids/${kidAdmin.id}?hardDelete=true`)
        .set("api-token", `${apiToken}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);
    });
  });

  afterAll(async () => {
    await userModel.destroy({ where: { email: parent.email }, force: true });
    await app.close();
  });
});
