import { Authorize, Controller } from "@common";
import { Get, Param } from "@nestjs/common";
import { RolesService } from "./roles.service";

@Controller("roles")
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

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
