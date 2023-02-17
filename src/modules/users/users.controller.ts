import { Get, Post, Body, Patch, Param, Delete, Query } from "@nestjs/common";
import { Authorize } from "modules/auth/decorators/authorize.decorator";
import { AdminOrSameUser } from "modules/auth/decorators/admin-or-same-user.decorator";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { Controller } from "decorators/controller.decorator";

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

  @AdminOrSameUser()
  @Get(":userId")
  findOne(@Param("userId") userId: number) {
    return this.usersService.findOne(userId);
  }

  @AdminOrSameUser()
  @Patch(":userId")
  update(@Param("userId") userId: number, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(userId, updateUserDto);
  }

  @Authorize({ action: "delete", resource: "users" })
  @Delete(":userId")
  remove(@Param("userId") userId: number) {
    return this.usersService.remove(userId);
  }
}
