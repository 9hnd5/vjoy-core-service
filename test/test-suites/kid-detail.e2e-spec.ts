import { API_CORE_PREFIX, API_TOKEN, expectError, KidDetail, ROLE_ID, signin, User } from "@common";
import { HttpStatus, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "app.module";
import { Op } from "sequelize";
import * as request from "supertest";

describe("KidDetail E2E Test", () => {
  let app: INestApplication;
  let adminToken = "";
  const apiToken = API_TOKEN;
  let userModel: typeof User;
  let kidDetailModel: typeof KidDetail;
  let agent: request.SuperAgentTest;
  let parent: User;
  let kid: User;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    userModel = moduleRef.get("UserRepository");
    kidDetailModel = moduleRef.get("KidDetailRepository");
    app = moduleRef.createNestApplication();
    app.enableVersioning();
    app.setGlobalPrefix("api");
    await app.init();

    agent = request.agent(app.getHttpServer());
    agent.set("api-token", apiToken);
    const { accessToken } = await signin();
    adminToken = accessToken;
    agent.set("authorization", `Bearer ${adminToken}`);

    parent = await userModel.create({ roleId: ROLE_ID.PARENT });
    kid = await userModel.create({ roleId: ROLE_ID.KID_FREE, parentId: parent.id });
  });

  afterAll(async () => {
    userModel && (await userModel.destroy({ where: { [Op.or]: [{ id: parent.id }, { id: kid.id }] }, force: true }));

    kidDetailModel && (await kidDetailModel.destroy({ where: { id: kid.id }, force: true }));

    app && (await app.close());
  });

  describe("Create kid detail (POST) api/:kidId/kidDetails", () => {
    let data: any;

    beforeAll(() => {
      data = {
        dob: "2015-01-01",
        gender: "M",
        profilePicture: "https://example.com/profile.jpg",
      };
    });

    it("should failed due to passed invalid data", () => {
      return agent
        .post(`${API_CORE_PREFIX}/kids/${kid.id}/kid-details`)
        .send({ dob: "2015-15-01", gender: "female", profilePicture: "" })
        .expect((res) => {
          const { error } = res.body;
          expect(error).toEqual([
            { code: "dob", message: expect.any(String) },
            { code: "gender", message: expect.any(String) },
            { code: "profilePicture", message: expect.any(String) },
          ]);
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should succeed due to passed valid data ", () => {
      return agent
        .post(`${API_CORE_PREFIX}/kids/${kid.id}/kid-details`)
        .send(data)
        .expect((res) => {
          const { data: result } = res.body;
          expect(result.id).toEqual(kid.id);
          expect(result.dob).toEqual(data.dob);
          expect(result.gender).toEqual(data.gender);
          expect(result.profilePicture).toEqual(data.profilePicture);
        });
    });
  });

  describe("Update kid detail (PATCH) api/:kidId/kid-details", () => {
    let data: any;

    beforeAll(() => {
      data = {
        dob: "2015-01-01",
        gender: "M",
        profilePicture: "https://example.com/profile.jpg",
      };
    });

    it("should failed due to passed invalid kid.id", () => {
      return agent
        .patch(`${API_CORE_PREFIX}/kids/-1/kid-details`)
        .send(data)
        .expect((res) => expectError(res.body))
        .expect(HttpStatus.NOT_FOUND);
    });

    it("should failed due to passed invalid data", () => {
      return agent
        .patch(`${API_CORE_PREFIX}/kids/${kid.id}/kid-details`)
        .send({
          dob: "2015-15-01",
          gender: "female",
          profilePicture: "",
        })
        .expect((res) => {
          const { error } = res.body;
          expect(error).toEqual([
            { code: "dob", message: expect.any(String) },
            { code: "gender", message: expect.any(String) },
            { code: "profilePicture", message: expect.any(String) },
          ]);
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should succeed due to passed valid data ", () => {
      return agent
        .patch(`${API_CORE_PREFIX}/kids/${kid.id}/kid-details`)
        .send(data)
        .expect((res) => {
          const { data: result } = res.body;
          expect(result.id).toEqual(kid.id);
          expect(result.dob).toEqual(data.dob);
          expect(result.gender).toEqual(data.gender);
          expect(result.profilePicture).toEqual(data.profilePicture);
        });
    });
  });
});
