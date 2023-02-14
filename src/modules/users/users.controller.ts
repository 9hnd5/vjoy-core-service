import { Controller, Get, Post, Body, Patch, Param, Delete, Query, BadRequestException } from "@nestjs/common";
import { Authorize } from "modules/auth/decorators/authorize.decorator";
import { AdminOrSameUser } from "modules/auth/decorators/admin-or-same-user.decorator";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { VerifyOTP } from "./dto/verify-otp.dto";

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
  async update(@Param("userId") userId: number, @Body() updateUserDto: UpdateUserDto) {
    const rs = await this.usersService.update(userId, updateUserDto);
    if (rs === -1) throw new BadRequestException("Email or Phone already exists");
    return rs;
  }

  @Authorize({ action: "delete", resource: "users" })
  @Delete(":userId")
  remove(@Param("userId") userId: number) {
    return this.usersService.remove(userId);
  }

  @Post("otp")
  verifyOTP(@Body() data: VerifyOTP) {
    return this.usersService.verifyOTP(data.otpToken, data.otpCode);
  }
}
