import {
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Inject,
  BadRequestException,
  ParseIntPipe,
} from "@nestjs/common";
import { KidsService } from "./kids.service";
import { CreateKidDto } from "./dto/create-kid.dto";
import { UpdateKidDto } from "./dto/update-kid.dto";
import { AdminOrSameUser } from "modules/auth/decorators/admin-or-same-user.decorator";
import { Authorize } from "modules/auth/decorators/authorize.decorator";
import { Controller } from "decorators/controller.decorator";
import { RolesService } from "modules/users/roles.service";
import { ROLE_CODE } from "modules/auth/auth.constants";
import { KidQueryDto } from "./dto/kid-query.dto";

@Controller()
export class KidsController {
  constructor(
    private readonly kidsService: KidsService,
    private readonly rolesService: RolesService,
    @Inject("REQUEST") private request: any
  ) {}

  @AdminOrSameUser()
  @Post("users/:userId/kids")
  async createKid(@Param("userId", ParseIntPipe) userId: number, @Body() createKidDto: CreateKidDto) {
    const role = await this.rolesService.findOneByCode(ROLE_CODE.KID_FREE);
    if (!role) throw new BadRequestException("Role not found");
    return this.kidsService.create({ ...createKidDto, parentId: userId, roleId: role.id });
  }

  @Authorize({ action: "list", resource: "kids" })
  @Get("kids")
  findAllKids(@Query() query: KidQueryDto) {
    return this.kidsService.findAll(undefined, query);
  }

  @AdminOrSameUser()
  @Get("users/:userId/kids")
  findAllKidsByUser(@Param("userId", ParseIntPipe) userId: number, @Query() query: KidQueryDto) {
    return this.kidsService.findAll(userId, query);
  }

  @AdminOrSameUser()
  @Get("users/:userId/kids/:kidId")
  findOneKid(@Param("userId", ParseIntPipe) userId: number, @Param("kidId", ParseIntPipe) kidId: number) {
    return this.kidsService.findOne(userId, kidId);
  }

  @AdminOrSameUser()
  @Patch("users/:userId/kids/:kidId")
  updateKid(
    @Param("userId", ParseIntPipe) userId: number,
    @Param("kidId", ParseIntPipe) kidId: number,
    @Body() updateKidDto: UpdateKidDto
  ) {
    const role = this.request.user?.roleCode;
    if (role !== "admin") {
      delete updateKidDto.parentId;
      delete updateKidDto.roleId;
    }
    return this.kidsService.update(userId, kidId, updateKidDto);
  }

  @AdminOrSameUser()
  @Delete("users/:userId/kids/:kidId")
  removeKid(
    @Param("userId", ParseIntPipe) userId: number,
    @Param("kidId", ParseIntPipe) kidId: number,
    @Query("hardDelete") hardDelete: boolean
  ) {
    const role = this.request.user?.roleCode;
    const isHardDelete = role === "admin" && hardDelete;
    return this.kidsService.remove(userId, kidId, isHardDelete);
  }
}
