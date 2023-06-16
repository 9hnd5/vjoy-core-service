import { Authorize, Controller } from "@common";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ConfigService } from "./config.service";
import { CreateConfigDto } from "./dto/create-config.dto";
import { FindConfigsQueryDto } from "./dto/find-configs-query.dto";
import { UpdateConfigDto } from "./dto/update-config.dto";
import { ApiBearerAuth } from "@nestjs/swagger";

@Controller("configs")
@ApiBearerAuth()
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Authorize({ action: "create", resource: "configs" })
  @Post()
  create(@Body() createConfigDto: CreateConfigDto) {
    return this.configService.create(createConfigDto);
  }

  @Authorize({ action: "list", resource: "configs" })
  @Get()
  findAll(@Query() query: FindConfigsQueryDto) {
    return this.configService.findAll(query);
  }

  @Authorize({ action: "read", resource: "configs" })
  @Get(":id")
  findOne(@Param("id") id: number) {
    return this.configService.findOne(id);
  }

  @Authorize({ action: "update", resource: "configs" })
  @Patch(":id")
  update(@Param("id") id: number, @Body() updateConfigDto: UpdateConfigDto) {
    return this.configService.update(id, updateConfigDto);
  }

  @Authorize({ action: "delete", resource: "configs" })
  @Delete(":id")
  remove(@Param("id") id: number, @Query("hardDelete") hardDelete: boolean) {
    return this.configService.remove(id, hardDelete);
  }
}
