import { Authorize, Controller } from "@common";
import { Body, Get, Param, Patch, Post } from "@nestjs/common";
import { CreateKidDetailDto } from "./dto/create-kid-detail.dto";
import { UpdateKidDetailDto } from "./dto/update-kid-detail.dto";
import { KidDetailService } from "./kid-detail.service";

@Controller()
export class KidDetailController {
  constructor(private readonly kidDetailService: KidDetailService) {}

  @Authorize({ action: "read", resource: "kids" })
  @Get("kids/:kidId/kid-details")
  findKidDetail(@Param("kidId") kidId: number) {
    return this.kidDetailService.find(kidId);
  }

  @Authorize({ action: "create", resource: "kids" })
  @Post("kids/:kidId/kid-details")
  createKidDetail(@Param("kidId") kidId: number, @Body() data: CreateKidDetailDto) {
    return this.kidDetailService.create(kidId, data);
  }

  @Authorize({ action: "update", resource: "kids" })
  @Patch("kids/:kidId/kid-details")
  updateKidDetail(@Param("kidId") kidId: number, @Body() data: UpdateKidDetailDto) {
    return this.kidDetailService.update(kidId, data);
  }
}
