import { Get, Post, Body, Patch, Param, Delete, Query, Inject, BadRequestException } from "@nestjs/common";
import { KidsService } from "./kids.service";
import { CreateKidDto } from "./dto/create-kid.dto";
import { UpdateKidDto } from "./dto/update-kid.dto";
import { AdminOrSameUser } from "modules/auth/decorators/admin-or-same-user.decorator";
import { Authorize } from "modules/auth/decorators/authorize.decorator";
import { Controller } from "decorators/controller.decorator";
import { RolesService } from "modules/users/roles.service";
import { ROLE_CODE } from "modules/auth/auth.constants";
import { QueryDto } from "dtos/query.dto";

@Controller()
export class KidsController {
  constructor(
    private readonly kidsService: KidsService,
    private readonly rolesService: RolesService,
    @Inject("REQUEST") private request: any
  ) {}

  @AdminOrSameUser()
  @Post("users/:userId/kids")
  async createKid(@Param("userId") userId: number, @Body() createKidDto: CreateKidDto) {
    const kidFree = await this.rolesService.findOneByCode(ROLE_CODE.KID_FREE);
    if (!kidFree) throw new BadRequestException("Role not found");
    const role = this.request.user?.roleCode;
    const roleId = role === ROLE_CODE.ADMIN ? createKidDto.roleId ?? kidFree.id : kidFree.id;
    return this.kidsService.create({ ...createKidDto, parentId: userId, roleId });
  }

  @Authorize({ action: "list", resource: "kids" })
  @Get("kids")
  findAllKids(@Query() query: QueryDto) {
    return this.kidsService.findAll(undefined, query);
  }

  @AdminOrSameUser()
  @Get("users/:userId/kids")
  findAllKidsByUser(@Param("userId") userId: number, @Query() query: QueryDto) {
    return this.kidsService.findAll(userId, query);
  }

  @AdminOrSameUser()
  @Get("users/:userId/kids/:kidId")
  findOneKid(@Param("userId") userId: number, @Param("kidId") kidId: number) {
    return this.kidsService.findOne(userId, kidId);
  }

  @AdminOrSameUser()
  @Patch("users/:userId/kids/:kidId")
  updateKid(@Param("userId") userId: number, @Param("kidId") kidId: number, @Body() updateKidDto: UpdateKidDto) {
    const role = this.request.user?.roleCode;
    if (role !== ROLE_CODE.ADMIN) {
      delete updateKidDto.parentId;
      delete updateKidDto.roleId;
    }
    return this.kidsService.update(userId, kidId, updateKidDto);
  }

  @AdminOrSameUser()
  @Delete("users/:userId/kids/:kidId")
  removeKid(@Param("userId") userId: number, @Param("kidId") kidId: number, @Query("hardDelete") hardDelete: boolean) {
    const role = this.request.user?.roleCode;
    const isHardDelete = role === ROLE_CODE.ADMIN && hardDelete;
    return this.kidsService.remove(userId, kidId, isHardDelete);
  }
}
