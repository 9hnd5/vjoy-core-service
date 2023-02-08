import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from "@nestjs/common";
import { Authorize } from "modules/auth/decorators/authorize.decorator";
import { AdminOrSameUser } from "modules/auth/decorators/admin-or-same-user.decorator";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Authorize({ action: "create", resource: "users" })
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Authorize({ action: "list", resource: "users" })
  @Get()
  findAll(@Query() query) {    
    return this.usersService.findAll(query);
  }

  @AdminOrSameUser("id")
  @Get(":id")
  findOne(@Param("id") id: number) {
    return this.usersService.findOne(id);
  }

  @AdminOrSameUser("id")
  @Patch(":id")
  update(@Param("id") id: number, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Authorize({ action: "delete", resource: "users" })
  @Delete(":id")
  remove(@Param("id") id: number) {
    return this.usersService.remove(id);
  }
}
