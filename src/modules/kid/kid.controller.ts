import { Authorize, Controller } from "@common";
import { Body, Get, Param, Post } from "@nestjs/common";
import { CreateKidDto } from "./dto/create-kid.dto";
import { KidService } from "./kid.service";

@Controller("kids")
export class KidController {
  constructor(private kidService: KidService) {}

  @Authorize({ resource: "kids", action: "create" })
  @Post()
  createKid(@Body() data: CreateKidDto) {
    return this.kidService.create(data);
  }

  @Authorize({ resource: "kids", action: "read" })
  @Get(":kidId/kid-details")
  findKidDetail(@Param("kidId") kidId: number) {
    return this.kidService.findKidDetail(kidId);
  }
}
