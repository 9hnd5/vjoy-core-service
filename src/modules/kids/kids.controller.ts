import { AdminOrSameUser, Authorize } from "@common";
import { Controller } from "@common";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CreateKidDto } from "./dto/create-kid.dto";
import { QueryKidDto } from "./dto/query-kid.dto";
import { UpdateKidDto } from "./dto/update-kid.dto";
import { KidsService } from "./kids.service";

@Controller()
export class KidsController {
  constructor(private readonly kidsService: KidsService) {}

  @AdminOrSameUser("parentId")
  @Post("users/:parentId/kids")
  async createKid(@Param("parentId") parentId: number, @Body() createKidDto: CreateKidDto) {
    return this.kidsService.create(createKidDto, parentId);
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
    return this.kidsService.findOne(parentId, kidId);
  }

  @AdminOrSameUser("parentId")
  @Patch("users/:parentId/kids/:kidId")
  updateKid(@Param("parentId") parentId: number, @Param("kidId") kidId: number, @Body() updateKidDto: UpdateKidDto) {
    return this.kidsService.update(parentId, kidId, updateKidDto);
  }

  @AdminOrSameUser("parentId")
  @Delete("users/:parentId/kids/:kidId")
  removeKid(
    @Param("parentId") parentId: number,
    @Param("kidId") kidId: number,
    @Query("hardDelete") hardDelete: boolean
  ) {
    return this.kidsService.remove(parentId, kidId, hardDelete);
  }
}
