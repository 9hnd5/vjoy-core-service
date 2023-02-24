import { HttpStatus, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "app.module";
import { Kid } from "entities/kid.entity";
import { User } from "entities/user.entity";
import { CreateKidDto } from "modules/kids/dto/create-kid.dto";
import { UpdateKidDto } from "modules/kids/dto/update-kid.dto";
import { Op } from "sequelize";
import * as request from "supertest";
import { API_CORE_PREFIX, API_TOKEN, createUser, signin } from "../test.util";

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
        roleId: 4,
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
        roleId: 1,
        parentId: 1,
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
        .send(createKidDto)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.CREATED)
        .expect((res) => {
          const result = res.body.data;
          expect(result.parentId).not.toEqual(createKidDto.parentId);
        });
    });

    it("Should succeed due to user is the same", () => {
      return agent
        .post(`${API_CORE_PREFIX}/users/${parent.id}/kids`)
        .send({ ...createKidDto, parentId: parent.id })
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.CREATED)
        .expect((res) => {
          const result = res.body.data;
          expect(result.firstname).toBe(createKidDto.firstname);
          expect(result.lastname).toBe(createKidDto.lastname);
          expect(result.dob).toBe(createKidDto.dob);
          expect(result.gender).toBe(createKidDto.gender);
          // expect(result.roleId).toBe(createKidDto.roleId);
          expect(result.parentId).toBe(parent.id);
          kid.createdByParent = result;
        });
    });

    it("Should succeed due to user is admin", () => {
      return agent
        .post(`${API_CORE_PREFIX}/users/${parent.id}/kids`)
        .send({ ...createKidDto, parentId: parent.id })
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.CREATED)
        .expect((res) => {
          const result = res.body.data;
          expect(result.firstname).toBe(createKidDto.firstname);
          expect(result.lastname).toBe(createKidDto.lastname);
          expect(result.dob).toBe(createKidDto.dob);
          expect(result.gender).toBe(createKidDto.gender);
          // expect(result.roleId).toBe(createKidDto.roleId);
          expect(result.parentId).toBe(parent.id);
          kid.createdByAdmin = result;
        });
    });
  });

  describe("Update kid (PATCH)api/users/:id/kids/:kidId", () => {
    let updateKidDto: UpdateKidDto;
    beforeAll(() => {
      updateKidDto = { firstname: "test-user-update", parentId: 0, roleId: 1 };
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

    it("Should succeed due to user is the same", async () => {
      return agent
        .patch(`${API_CORE_PREFIX}/users/${parent.id}/kids/${kid["createdByParent"].id}`)
        .send(updateKidDto)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.OK)
        .then((res) => {
          const updatedKid = res.body.data;
          expect(updatedKid.firstname).toBe(updateKidDto.firstname);
          expect(updatedKid.parentId).not.toBe(updateKidDto.parentId); //Not allow change parent to admin
          expect(updatedKid.roleId).not.toBe(updateKidDto.roleId); //Not allow change role to admin
        });
    });

    it("Should succeed due to user is admin", async () => {
      return agent
        .patch(`${API_CORE_PREFIX}/users/${parent.id}/kids/${kid["createdByParent"].id}`)
        .send(updateKidDto)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.OK)
        .then((res) => {
          const updatedKid = res.body.data;
          expect(updatedKid.firstname).toBe(updateKidDto.firstname);
          expect(updatedKid.parentId).toBe(updateKidDto.parentId); // Is allow update parentId?
          expect(updatedKid.roleId).not.toBe(updateKidDto.roleId); // Is admin allow to change role from kid to admin?
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
        .expect(HttpStatus.OK)
        .expect((response) => {
          const { data } = response.body;
          expect(data.rows.length).toEqual(10);
        });
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
        .expect(HttpStatus.BAD_REQUEST); //Actual 500
    });

    it("Should succeed due to user is the same", () => {
      return agent
        .get(`${API_CORE_PREFIX}/users/${parent.id}/kids/${kid["createdByParent"].id}/`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(HttpStatus.OK)
        .expect((res) => {
          const kid = res.body.data;
          expect(kid.parentId).toEqual(parent.id);
        });
    });

    it("Should succeed due to user is admin", () => {
      return agent
        .get(`${API_CORE_PREFIX}/users/${parent.id}/kids/${kid["createdByParent"].id}/`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.OK)
        .expect((res) => {
          const kid = res.body.data;
          expect(kid.parentId).toEqual(parent.id);
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
          const deletedKid = await kidModel.findOne({ where: { id: kid["createdByParent"].id } });
          expect(deletedKid).not.toBeNull();
          expect(deletedKid?.deletedAt).not.toBeNull();
        });
    });

    it("Should succeed due to user having sufficient privileges (Hard delete)", async () => {
      return agent
        .delete(`${API_CORE_PREFIX}/users/${parent.id}/kids/${kid["createdByParent"].id}?hardDelete=true`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(HttpStatus.OK)
        .then(async () => {
          const deletedKid = await kidModel.findOne({ where: { id: kid["createdByParent"].id } });
          expect(deletedKid).toBeNull();
        });
    });

    it("Should succeed due to user having sufficient privileges (Hard delete)", async () => {
      return agent
        .delete(`${API_CORE_PREFIX}/users/${parent.id}/kids/${kid["createdByAdmin"].id}?hardDelete=true`)
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
