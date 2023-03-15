import { AdminOrSameUser, Authorize } from "@common";
import { Controller } from "@common";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CreateKidByAdminDto } from "./dto/create-kid-by-admin.dto";
import { CreateKidDto } from "./dto/create-kid.dto";
import { QueryKidDto } from "./dto/query-kid.dto";
import { UpdateKidByAdminDto } from "./dto/update-kid-by-admin.dto";
import { UpdateKidDto } from "./dto/update-kid.dto";
import { KidsService } from "./kids.service";

@Controller()
export class KidsController {
  constructor(private readonly kidsService: KidsService) {}

  @AdminOrSameUser("parentId")
  @Post("users/:parentId/kids")
  async createKid(@Param("parentId") parentId: number, @Body() createKidDto: CreateKidDto) {
    return this.kidsService.createByUser(createKidDto, parentId);
  }

  @Authorize({ action: "list", resource: "kids" })
  @Get("kids")
  findAllKids(@Query() query: QueryKidDto) {
    return this.kidsService.findAll(query);
  }

  @AdminOrSameUser("parentId")
  @Get("users/:parentId/kids")
  findAllKidsByUser(@Param("parentId") parentId: number, @Query() query: QueryKidDto) {
    return this.kidsService.findAll(query, parentId);
  }

  @AdminOrSameUser("parentId")
  @Get("users/:parentId/kids/:kidId")
  findOneKid(@Param("parentId") parentId: number, @Param("kidId") kidId: number) {
    return this.kidsService.findOneByUser(parentId, kidId);
  }

  @AdminOrSameUser("parentId")
  @Patch("users/:parentId/kids/:kidId")
  updateKid(@Param("parentId") parentId: number, @Param("kidId") kidId: number, @Body() updateKidDto: UpdateKidDto) {
    return this.kidsService.updateByUser(parentId, kidId, updateKidDto);
  }

  @AdminOrSameUser("parentId")
  @Delete("users/:parentId/kids/:kidId")
  removeKid(
    @Param("parentId") parentId: number,
    @Param("kidId") kidId: number,
    @Query("hardDelete") hardDelete: boolean
  ) {
    return this.kidsService.removeByUser(parentId, kidId, hardDelete);
  }

  @Authorize({ action: "create", resource: "kids" })
  @Post("kids")
  async createKidByAdmin(@Body() createKidDto: CreateKidByAdminDto) {
    return this.kidsService.createByAdmin(createKidDto);
  }

  @Authorize({ action: "read", resource: "kids" })
  @Get("kids/:kidId")
  findOneKidByAdmin(@Param("kidId") kidId: number) {
    return this.kidsService.findOneByAdmin(kidId);
  }

  @Authorize({ action: "update", resource: "kids" })
  @Patch("kids/:kidId")
  updateKidByAdmin(@Param("kidId") kidId: number, @Body() updateKidDto: UpdateKidByAdminDto) {
    return this.kidsService.updateByAdmin(kidId, updateKidDto);
  }

  @Authorize({ action: "delete", resource: "kids" })
  @Delete("kids/:kidId")
  removeKidByAdmin(@Param("kidId") kidId: number, @Query("hardDelete") hardDelete: boolean) {
    return this.kidsService.removeByAdmin(kidId, hardDelete);
  }
}
