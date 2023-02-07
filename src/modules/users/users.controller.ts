import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from "@nestjs/common";
import { Authorize } from "src/modules/auth/decorators/authorize.decorator";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Authorize({ action: "write", resource: "users" })
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Authorize({ action: "read", resource: "users" })
  @Get()
  findAll(@Query() query) {    
    return this.usersService.findAll(query);
  }

  @Authorize({ action: "read", resource: "users" })
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.usersService.findOne(+id);
  }

  @Authorize({ action: "write", resource: "users" })
  @Patch(":id")
  update(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Authorize({ action: "delete", resource: "users" })
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.usersService.remove(+id);
  }
}
