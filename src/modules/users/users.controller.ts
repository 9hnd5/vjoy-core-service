import { Get, Post, Body, Patch, Param, Delete, Query, Inject } from "@nestjs/common";
import { Authorize } from "modules/auth/decorators/authorize.decorator";
import { AdminOrSameUser } from "modules/auth/decorators/admin-or-same-user.decorator";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { Controller } from "decorators/controller.decorator";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { ROLE_CODE } from "modules/auth/auth.constants";
import { QueryUserDto } from "./dto/query-user.dto";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService, @Inject("REQUEST") private request: any) {}

  @Authorize({ action: "create", resource: "users" })
  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return await this.usersService.createByAdmin(createUserDto).then((user) => {
      delete user.dataValues.password;
      return user.dataValues;
    });
  }

  @Authorize({ action: "list", resource: "users" })
  @Get()
  findAll(@Query() query: QueryUserDto) {
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
    const updatedUser = await this.usersService.update(userId, updateUserDto);
    delete updatedUser.password;
    return updatedUser;
  }

  @AdminOrSameUser()
  @Delete(":userId")
  remove(@Param("userId") userId: number, @Query("hardDelete") hardDelete: boolean) {
    const role = this.request.user?.roleCode;
    const isHardDelete = role === ROLE_CODE.ADMIN && hardDelete;
    return this.usersService.remove(userId, isHardDelete);
  }

  @Post("otp")
  async verifyOTP(@Body() data: VerifyOtpDto) {
    return await this.usersService.verifyOtp(data.otpCode, data.otpToken).then((user) => {
      delete user.password;
      return user;
    });
  }
}
