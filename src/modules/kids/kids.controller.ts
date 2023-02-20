import { Get, Post, Body, Patch, Param, Delete, Query, Inject } from "@nestjs/common";
import { KidsService } from "./kids.service";
import { CreateKidDto } from "./dto/create-kid.dto";
import { UpdateKidDto } from "./dto/update-kid.dto";
import { AdminOrSameUser } from "modules/auth/decorators/admin-or-same-user.decorator";
import { Authorize } from "modules/auth/decorators/authorize.decorator";
import { Controller } from "decorators/controller.decorator";

@Controller()
export class KidsController {
  constructor(private readonly kidsService: KidsService, @Inject("REQUEST") private request: any) {}

  @AdminOrSameUser()
  @Post("users/:userId/kids")
  createKid(@Body() createKidDto: CreateKidDto) {
    return this.kidsService.create(createKidDto);
  }

  @Authorize({ action: "list", resource: "kids" })
  @Get("kids")
  findAllKids(@Query() query) {
    return this.kidsService.findAll(undefined, query);
  }

  @AdminOrSameUser()
  @Get("users/:userId/kids")
  findAllKidsByUser(@Param("userId") userId: number, @Query() query) {
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
    return this.kidsService.update(userId, kidId, updateKidDto);
  }

  @AdminOrSameUser()
  @Delete("users/:userId/kids/:kidId")
  removeKid(@Param("userId") userId: number, @Param("kidId") kidId: number, @Query("hardDelete") hardDelete: boolean) {
    const role = this.request.user?.roleCode;
    const isHardDelete = role === "admin" && hardDelete;
    return this.kidsService.remove(userId, kidId, isHardDelete);
  }
}
