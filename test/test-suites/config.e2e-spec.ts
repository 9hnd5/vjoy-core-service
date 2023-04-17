import { API_CORE_PREFIX, API_TOKEN, createUser, deleteUser, expectError, generateNumber, ROLE_ID, signin, User } from "@common";
import { HttpStatus, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "app.module";
import { Config } from "@common";
import { CreateConfigDto } from "modules/config/dto/create-config.dto";
import { UpdateConfigDto } from "modules/config/dto/update-config.dto";
import * as request from "supertest";

describe("Configs E2E Test", () => {
  let app: INestApplication;
  let userToken = "";
  let adminToken = "";
  let content: User["dataValues"];
  let config: Config["dataValues"];
  let configModel: typeof Config;
  const apiToken = API_TOKEN;
  let agent: request.SuperAgentTest;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    configModel = moduleRef.get("ConfigRepository");
    app = moduleRef.createNestApplication();
    app.enableVersioning();
    app.setGlobalPrefix("api");
    await app.init();

    agent = request.agent(app.getHttpServer());
    agent.set("api-token", apiToken);
    const { accessToken: adToken } = await signin();
    adminToken = adToken;

    const name = `test-config-${generateNumber(10)}`;
    content = await createUser({
      newUser: {
        firstname: name,
        lastname: name,
        email: `${name}@gmail.com`,
        password: "123456",
        roleId: ROLE_ID.CONTENT_EDITOR,
      },
      accessToken: adminToken,
    });

    const { accessToken: ctToken } = await signin({ email: content.email!, password: "123456" });
    userToken = ctToken;
  });

  describe("Create config (POST)api/configs", () => {
    let createDto: CreateConfigDto;
    beforeAll(() => {
      createDto = {
        type: `test-config-${generateNumber(10)}`,
      };
    });

    it("Should fail due to user unauthorized", () => {
      return agent.post(`${API_CORE_PREFIX}/configs`).expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should fail due to user is not admin", () => {
      return agent
        .post(`${API_CORE_PREFIX}/configs`)
        .send(createDto)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should fail due to invalid field", () => {
      return agent
        .post(`${API_CORE_PREFIX}/configs`)
        .send({ type: null })
        .set("Authorization", `Bearer ${adminToken}`)
        .expect((res) => {
          const { error } = res.body;
          expect(error).not.toBeNull();
          expect(error[0].code).toBe("type");
          expect(error[0].message).not.toBeNull();
        });
    });

    it("Should succeed due to user is admin", () => {
      return agent
        .post(`${API_CORE_PREFIX}/configs`)
        .send(createDto)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect((res) => {
          const result = res.body.data;
          expect(result.type).toBe(createDto.type);
          config = result;
        })
        .expect(HttpStatus.CREATED);
    });
  });

  describe("Get all (GET)api/configs", () => {
    it("Should fail due to user unauthorized", () => {
      return agent
        .get(`${API_CORE_PREFIX}/configs?page=1&pageSize=10&sort=[["id","ASC"]]`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should fail due to invalid query params(page & pageSize & status) value", () => {
      return agent
        .get(`${API_CORE_PREFIX}/configs?page=a&pageSize=a&sort=[["id","ASC"]]`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("Should fail due to user lacking sufficient privileges", () => {
      return agent
        .get(`${API_CORE_PREFIX}/configs?page=1&pageSize=10&sort=[["id","ASC"]]`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect((response: request.Response) => {
          expectError(response.body);
        })
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should succeed due to user having sufficient privileges", () => {
      return agent
        .get(`${API_CORE_PREFIX}/configs?page=1&pageSize=10&sort=[["id","ASC"]]&filter={"type":"config"}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect((response) => {
          const { data } = response.body;
          expect(data.rows.length).toBeGreaterThan(0);
        })
        .expect(HttpStatus.OK);
    });
  });

  describe("Update config (PATCH)api/configs/:id", () => {
    let updateDto: UpdateConfigDto;
    beforeAll(() => {
      updateDto = { type: `test-updateConfig-${generateNumber(10)}` };
    });

    it("Should fail due to user unauthorized", () => {
      return agent
        .patch(`${API_CORE_PREFIX}/configs/${config.id}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should fail due to invalid params(id)", () => {
      return agent
        .patch(`${API_CORE_PREFIX}/configs/undefined`)
        .send(updateDto)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("Should fail due to user is not admin", () => {
      return agent
        .patch(`${API_CORE_PREFIX}/configs/${config.id}`)
        .send(updateDto)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should succeed due to user is admin", async () => {
      return agent
        .patch(`${API_CORE_PREFIX}/configs/${config.id}`)
        .send(updateDto)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect((res) => {
          const updated = res.body.data;
          expect(updated.type).toBe(updateDto.type);
        })
        .expect(HttpStatus.OK);
    });
  });

  describe("Get one (GET)api/configs/:id", () => {
    it("Should fail due to user unauthorized", () => {
      return agent.get(`${API_CORE_PREFIX}/configs/${config.id}/`).expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should fail due to invalid params(id)", () => {
      return agent
        .get(`${API_CORE_PREFIX}/configs/undefined`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("Should fail due to user lacking sufficient privileges", () => {
      const id = config.id;
      return agent
        .get(`${API_CORE_PREFIX}/configs/${id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect((response: request.Response) => {
          expectError(response.body);
        })
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should succeed due to user having sufficient privileges", () => {
      const id = config.id;
      return agent
        .get(`${API_CORE_PREFIX}/configs/${id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect((res) => {
          const responseData = res.body.data;
          expect(responseData.id).toEqual(id);
        })
        .expect(HttpStatus.OK);
    });
  });

  describe("Delete config (DELETE)api/configs/:id", () => {
    it("Should fail due to user unauthorized", () => {
      return agent
        .delete(`${API_CORE_PREFIX}/configs/${config.id}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should fail due to invalid params(id)", () => {
      return agent
        .delete(`${API_CORE_PREFIX}/configs/undefined`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("Should fail due to user is not admin", () => {
      return agent
        .delete(`${API_CORE_PREFIX}/configs/${config.id}/`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should succeed due to user having sufficient privileges (Soft Delete)", async () => {
      return agent
        .delete(`${API_CORE_PREFIX}/configs/${config.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(async () => {
          const deleted = await configModel.findOne({ where: { id: config.id }, paranoid: false });
          expect(deleted?.deletedAt).not.toBeNull();
        })
        .expect(HttpStatus.OK);
    });

    it("Should succeed due to user is admin (Hard delete)", async () => {
      return agent
        .delete(`${API_CORE_PREFIX}/configs/${config.id}?hardDelete=true`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(async () => {
          const deleted = await configModel.findOne({ where: { id: config.id } });
          expect(deleted).toBeNull();
        })
        .expect(HttpStatus.OK);
    });
  });

  afterAll(async () => {
    await deleteUser({ id: content.id, accessToken: adminToken });

    await app.close();
  });
});
