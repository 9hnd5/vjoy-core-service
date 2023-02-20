import { Get, Post, Body, Patch, Param, Delete, Query, Inject } from "@nestjs/common";
import { Authorize } from "modules/auth/decorators/authorize.decorator";
import { AdminOrSameUser } from "modules/auth/decorators/admin-or-same-user.decorator";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { Controller } from "decorators/controller.decorator";
import { VerifyOtpDto } from "./dto/verify-otp.dto";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService, @Inject("REQUEST") private request: any) {}

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

  @AdminOrSameUser()
  @Delete(":userId")
  remove(@Param("userId") userId: number, @Query("hardDelete") hardDelete: boolean) {
    const role = this.request.user?.roleCode;
    const isHardDelete = role === "admin" && hardDelete;
    return this.usersService.remove(userId, isHardDelete);
  }

  @Post("otp")
  verifyOTP(@Body() data: VerifyOtpDto) {
    return this.usersService.verifyOtp(data.otpCode, data.otpToken);
  }
}
