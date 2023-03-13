import { API_CORE_PREFIX, API_TOKEN, createUser, generateNumber, Kid, ROLE_CODE, signin, User } from "@common";
import { HttpStatus, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "app.module";
import { CreateKidDto } from "modules/kids/dto/create-kid.dto";
import { UpdateKidDto } from "modules/kids/dto/update-kid.dto";
import { Op } from "sequelize";
import * as request from "supertest";

describe("KidsController E2E Test", () => {
  let app: INestApplication;
  let userToken = "";
  let adminToken = "";
  let parent: User["dataValues"];
  const kid: {
    createdByParent: Kid["dataValues"];
    createdByAdmin: Kid["dataValues"];
  } = {} as any;
  const apiToken = API_TOKEN;
  let userModel: typeof User;
  let kidModel: typeof Kid;
  let agent: request.SuperAgentTest;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    userModel = moduleRef.get("UserRepository");
    kidModel = moduleRef.get("KidRepository");
    app = moduleRef.createNestApplication();
    app.enableVersioning();
    app.setGlobalPrefix("api");
    await app.init();

    agent = request.agent(app.getHttpServer());
    agent.set("api-token", apiToken);
    const { accessToken: adToken } = await signin();
    adminToken = adToken;
    parent = await createUser({
      newUser: {
        firstname: "testParent",
        lastname: "testParent",
        email: "testParent@gmail.com",
        phone: "0931336273",
        roleCode: ROLE_CODE.PARENT,
      },
      accessToken: adminToken,
    });

    const { accessToken: parentToken } = await signin({ email: parent.email!, password: "123456" });
    userToken = parentToken;
  });

  describe("Create kid (POST)api/users/:id/kids", () => {
    let createKidDto: CreateKidDto;
    beforeAll(() => {
      createKidDto = {
        firstname: "api-test-firstname",
        lastname: "api-test-lastname",
        dob: "2022-02-02",
        gender: "M",
        roleCode: ROLE_CODE.ADMIN,
      };
    });
    it("Should fail due to user unauthorized", () => {
      return agent.post(`${API_CORE_PREFIX}/users/${parent.id}/kids`).expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should fail due to invalid params(userId)", () => {
      return agent
        .post(`${API_CORE_PREFIX}/users/undefined/kids`)
        .send(createKidDto)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.BAD_REQUEST); //Actual 201
    });

    it("Should fail due to user is not the same", () => {
      return agent
        .post(`${API_CORE_PREFIX}/users/1/kids`)
        .send(createKidDto)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should fail due to invalid field", () => {
      return agent
        .post(`${API_CORE_PREFIX}/users/${parent.id}/kids`)
        .send({ ...createKidDto, gender: null })
        .set("Authorization", `Bearer ${userToken}`)
        .expect((res) => {
          const { error } = res.body;
          expect(error).not.toBeNull();
          expect(error[0].code).toBe("gender");
          expect(error[0].message).not.toBeNull();
        });
    });

    it("Should fail due to parentId is not allow pass to body", () => {
      return agent
        .post(`${API_CORE_PREFIX}/users/${parent.id}/kids`)
        .send({ ...createKidDto, parentId: 1 })
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.CREATED)
        .expect((res) => {
          const data = res.body.data;
          expect(data.parentId).not.toBe(1);
        });
    });

    it("Should succeed due to user is the same", () => {
      return agent
        .post(`${API_CORE_PREFIX}/users/${parent.id}/kids`)
        .send(createKidDto)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.CREATED)
        .expect((res) => {
          const result = res.body.data;
          expect(result.firstname).toBe(createKidDto.firstname);
          expect(result.lastname).toBe(createKidDto.lastname);
          expect(result.dob).toBe(createKidDto.dob);
          expect(result.gender).toBe(createKidDto.gender);
          expect(result.roleCode).toBe(ROLE_CODE.KID_FREE);
          expect(result.parentId).toBe(parent.id);
          kid.createdByParent = result;
        });
    });

    it("Should succeed due to user is admin", () => {
      return agent
        .post(`${API_CORE_PREFIX}/users/${parent.id}/kids`)
        .send(createKidDto)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.CREATED)
        .expect((res) => {
          const result = res.body.data;
          expect(result.firstname).toBe(createKidDto.firstname);
          expect(result.lastname).toBe(createKidDto.lastname);
          expect(result.dob).toBe(createKidDto.dob);
          expect(result.gender).toBe(createKidDto.gender);
          expect(result.roleCode).toBe(createKidDto.roleCode);
          expect(result.parentId).toBe(parent.id);
          kid.createdByAdmin = result;
        });
    });
  });

  describe("Update kid (PATCH)api/users/:id/kids/:kidId", () => {
    let updateKidDto: UpdateKidDto;
    beforeAll(() => {
      updateKidDto = { firstname: "test-user-update", roleCode: ROLE_CODE.ADMIN };
    });

    it("Should fail due to user unauthorized", () => {
      return agent
        .patch(`${API_CORE_PREFIX}/users/${parent.id}/kids/${kid["createdByParent"].id}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should fail due to invalid params(userId, kidId)", () => {
      return agent
        .patch(`${API_CORE_PREFIX}/users/undefined/kids/undefined`)
        .send(updateKidDto)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.BAD_REQUEST); //Actual 500
    });

    it("Should fail due to user is not the same", () => {
      return agent
        .patch(`${API_CORE_PREFIX}/users/1/kids/${kid["createdByParent"].id}`)
        .send(updateKidDto)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should fail due to user is admin but parentId is not exists", () => {
      const parentId = generateNumber(10);
      return agent
        .patch(`${API_CORE_PREFIX}/users/${parentId}/kids/${kid["createdByAdmin"].id}`)
        .send(updateKidDto)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it("Should fail due to user is not allow update role", async () => {
      return agent
        .patch(`${API_CORE_PREFIX}/users/${parent.id}/kids/${kid["createdByParent"].id}`)
        .send(updateKidDto)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should success due to user is the same", async () => {
      const data = {
        firstname: updateKidDto.firstname,
      };
      return agent
        .patch(`${API_CORE_PREFIX}/users/${parent.id}/kids/${kid["createdByParent"].id}`)
        .send(data)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.OK)
        .expect((res) => {
          const updatedKid = res.body.data;
          expect(updatedKid.firstname).toBe(data.firstname);
        });
    });

    it("Should succeed due to user is admin", async () => {
      return agent
        .patch(`${API_CORE_PREFIX}/users/${parent.id}/kids/${kid["createdByAdmin"].id}`)
        .send(updateKidDto)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.OK)
        .then((res) => {
          const updatedKid = res.body.data;
          expect(updatedKid.firstname).toBe(updateKidDto.firstname);
          expect(updatedKid.parentId).toBe(parent.id); // admin allow update parentId
          expect(updatedKid.roleCode).toBe(ROLE_CODE.ADMIN); // admin allow to change role from kid to admin
        });
    });
  });

  describe("Get kids (GET)api/kids", () => {
    it("Should fail due to user unauthorized", () => {
      return agent
        .get(`${API_CORE_PREFIX}/kids?page=1&pageSize=10&sort=[["id","ASC"]]`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should fail due to user lacking sufficient privileges", () => {
      return agent
        .get(`${API_CORE_PREFIX}/kids?page=1&pageSize=10&sort=[["id","ASC"]]`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should fail due to invalid query params(page & pageSize) value", () => {
      return agent
        .get(`${API_CORE_PREFIX}/kids?page=a&pageSize=a&sort=[["id","ASC"]]`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.BAD_REQUEST); //Actual 500
    });

    it("Should succeed due to user having sufficient privileges", () => {
      return agent
        .get(`${API_CORE_PREFIX}/kids?page=1&pageSize=10&sort=[["id","ASC"]]`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect((response) => {
          const { data } = response.body;
          expect(data.rows.length).toEqual(10);
        })
        .expect(HttpStatus.OK);
    });
  });

  describe("Get one kid (GET)api/users/:userId/kids/:kidId", () => {
    it("Should fail due to user unauthorized", () => {
      return agent
        .get(`${API_CORE_PREFIX}/users/${parent.id}/kids/${kid["createdByParent"].id}/`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should fail due to user is not the same", () => {
      return agent
        .get(`${API_CORE_PREFIX}/users/1/kids/${kid["createdByParent"].id}/`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should fail due to invalid params(userId, kidId)", () => {
      return agent
        .get(`${API_CORE_PREFIX}/users/undefined/kids/undefined/`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("Should succeed due to user is the same", () => {
      const parentId = kid["createdByParent"].parentId;
      const kidId = kid["createdByParent"].id;
      return agent
        .get(`${API_CORE_PREFIX}/users/${parentId}/kids/${kidId}/`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.OK)
        .expect((res) => {
          const responseData = res.body.data;
          expect(responseData.parent.id).toEqual(parentId);
        });
    });

    it("Should succeed due to user is admin", () => {
      const parentId = kid["createdByAdmin"].parentId;
      const kidId = kid["createdByAdmin"].id;
      return agent
        .get(`${API_CORE_PREFIX}/users/${parentId}/kids/${kidId}/`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.OK)
        .expect((res) => {
          const responseData = res.body.data;
          expect(responseData.parent.id).toEqual(parentId);
        });
    });
  });

  describe("Get kids by parent (GET)api/users/:userId/kids", () => {
    it("Should fail due to user unauthorized", () => {
      return agent
        .get(`${API_CORE_PREFIX}/users/${parent.id}/kids?page=1&pageSize=10&sort=[["id","ASC"]]`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should fail due to user is not the same", () => {
      return agent
        .get(`${API_CORE_PREFIX}/users/1/kids?page=1&pageSize=10&sort=[["id","ASC"]]`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("Should fail due to invalid params(userId)", () => {
      return agent
        .get(`${API_CORE_PREFIX}/users/undefined/kids?page=1&pageSize=10&sort=[["id","ASC"]]`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.BAD_REQUEST); //Actual 500
    });

    it("Should fail due to invalid query params(page & pageSize) value", () => {
      return agent
        .get(`${API_CORE_PREFIX}/users/1/kids?page=a&pageSize=a&sort=[["id","ASC"]]`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("Should succeed due to user is the same", () => {
      return agent
        .get(`${API_CORE_PREFIX}/users/${parent.id}/kids?page=1&pageSize=10&sort=[["id","ASC"]]`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.OK);
    });

    it("Should succeed due to user is admin", () => {
      return agent
        .get(`${API_CORE_PREFIX}/users/${parent.id}/kids?page=1&pageSize=10&sort=[["id","ASC"]]`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);
    });
  });

  describe("Delete kid (DELETE)api/users/:userId/kids/:id", () => {
    it("Should fail due to user unauthorized", () => {
      return agent
        .delete(`${API_CORE_PREFIX}/users/${parent.id}/kids/${kid["createdByParent"].id}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it("Should fail due to invalid params(userId, kidId)", () => {
      return agent
        .delete(`${API_CORE_PREFIX}/users/undefined/kids/undefined`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.BAD_REQUEST); //Actual 200
    });

    it("Should succeed due to user having sufficient privileges (Soft Delete)", async () => {
      return agent
        .delete(`${API_CORE_PREFIX}/users/${parent.id}/kids/${kid["createdByParent"].id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.OK)
        .then(async () => {
          const deletedKid = await kidModel.findOne({ where: { id: kid["createdByParent"].id }, paranoid: false });
          expect(deletedKid).not.toBeNull();
          expect(deletedKid?.deletedAt).not.toBeNull();
        });
    });

    it("Should fail due to user is not admin (Hard delete)", async () => {
      return agent
        .delete(`${API_CORE_PREFIX}/users/${parent.id}/kids/${kid["createdByParent"].id}?hardDelete=true`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.UNAUTHORIZED)
        .expect((res) => {
          const { error } = res.body;
          expect(error).not.toBeNull();
        });
    });

    it("Should succeed due to user having sufficient privileges (Hard delete)", async () => {
      return agent
        .delete(
          `${API_CORE_PREFIX}/users/${kid["createdByAdmin"].parentId}/kids/${kid["createdByAdmin"].id}?hardDelete=true`
        ) // changed to 0 by updated before
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.OK)
        .then(async () => {
          const deletedKid = await kidModel.findOne({ where: { id: kid["createdByAdmin"].id } });
          expect(deletedKid).toBeNull();
        });
    });
  });

  afterAll(async () => {
    await userModel.destroy({ where: { email: parent.email }, force: true });
    await kidModel.destroy({
      where: {
        firstname: {
          [Op.like]: "api-test-firstname",
        },
      },
      force: true,
    });
    await app.close();
  });
});
