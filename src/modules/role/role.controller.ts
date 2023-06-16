import { Authorize, Controller } from "@common";
import { Get, Param } from "@nestjs/common";
import { RoleService } from "./role.service";
import { ApiBearerAuth } from "@nestjs/swagger";

@Controller("roles")
@ApiBearerAuth()
export class RoleController {
  constructor(private readonly rolesService: RoleService) {}

  @Authorize({ action: "list", resource: "roles" })
  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @Authorize({ action: "read", resource: "roles" })
  @Get(":id")
  findOne(@Param("id") id: number) {
    return this.rolesService.findOne(id);
  }
}
