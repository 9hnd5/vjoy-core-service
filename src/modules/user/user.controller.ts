import { Get, Post, Body, Patch, Param, Delete, Query, Inject } from "@nestjs/common";
import { UserService } from "./user.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { Public, ROLE_ID, UserId } from "@common";
import { FindUsersQueryDto } from "./dto/find-users-query.dto";
import { AdminOrSameUser, Authorize, Controller } from "@common";
import { ChangePasswordDto } from "./dto/change-password.dto";

@Controller("users")
export class UserController {
  constructor(private readonly usersService: UserService, @Inject("REQUEST") private request: any) {}

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
  findAll(@Query() query: FindUsersQueryDto) {
    return this.usersService.findAll(query);
  }

  @AdminOrSameUser()
  @Get(":userId")
  findOne(@Param("userId") userId: number) {
    return this.usersService.findOne(userId);
  }

  @Authorize()
  @Patch("password")
  changePassword(@UserId() userId: number, @Body() { oldPassword, newPassword }: ChangePasswordDto) {
    return this.usersService.changePassword(userId, newPassword, oldPassword);
  }

  @AdminOrSameUser()
  @Patch(":userId")
  async update(@Param("userId") userId: number, @Body() updateUserDto: UpdateUserDto) {
    const updatedUser = await this.usersService.updateWithoutOtp(userId, updateUserDto);
    delete updatedUser.password;
    return updatedUser;
  }

  @AdminOrSameUser()
  @Delete(":userId")
  remove(@Param("userId") userId: number, @Query("hardDelete") hardDelete: boolean) {
    const role = this.request.user?.roleId;
    const isHardDelete = role === ROLE_ID.ADMIN && hardDelete;
    return this.usersService.remove(userId, isHardDelete);
  }

  @Public()
  @Post("otp")
  async verifyOTP(@Body() data: VerifyOtpDto) {
    return await this.usersService.verifyOtp(data.otpCode, data.otpToken).then((user) => {
      delete user.password;
      return user;
    });
  }
}
