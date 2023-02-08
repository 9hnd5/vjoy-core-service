import { Controller, Get, Param } from "@nestjs/common";
import { Authorize } from "modules/auth/decorators/authorize.decorator";
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
