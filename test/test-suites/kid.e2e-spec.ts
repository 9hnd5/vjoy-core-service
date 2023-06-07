import { API_CORE_PREFIX, API_TOKEN, ROLE_ID, signin, User } from "@common";
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
  let agent: request.SuperAgentTest;
  let parent: User;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    userModel = moduleRef.get("UserRepository");
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
  });

  afterAll(async () => {
    userModel && (await userModel.destroy({ where: { [Op.or]: [{ id: parent.id }] }, force: true }));

    app && (await app.close());
  });

  describe("Create kid (POST) api/kids", () => {
    let data: any;

    beforeAll(() => {
      data = {
        parentId: parent.id,
        avatar: "https://example.com/profile.jpg",
        character: {
          name: "Tom",
          url: "https://example.com/cat1.jpg",
        },
      };
    });

    it("should failed due to passed invalid data", () => {
      return agent
        .post(`${API_CORE_PREFIX}/kids`)
        .send({})
        .expect((res) => {
          const { error } = res.body;
          expect(error).toEqual([
            { code: "parentId", message: expect.any(String) },
            { code: "avatar", message: expect.any(String) },
            { code: "character", message: expect.any(String) },
          ]);
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should succeed due to passed valid data ", () => {
      return agent
        .post(`${API_CORE_PREFIX}/kids`)
        .send(data)
        .expect((res) => {
          const { data: result } = res.body;
          expect(result.parentId).toBe(data.parentId);
          expect(result.kidDetail.avatar).toBe(data.avatar);
          expect(result.kidDetail.character).toEqual(data.character);
        });
    });
  });
});
