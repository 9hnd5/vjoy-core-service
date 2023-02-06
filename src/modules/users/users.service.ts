import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { AuthService } from "src/modules/auth/auth.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { User } from "./entities/user.entity";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User)
    private userModel: typeof User,

    private readonly authService: AuthService
  ) {}

  async create(createUserDto: CreateUserDto) {
    const pass = await this.authService.createPassword('123456');
    const rs = await this.userModel.create({ 
      firstname: createUserDto.firstname,
      lastname: createUserDto.lastname,
      email: createUserDto.email,
      password: pass,
      phone: createUserDto.phone,
      roleId: createUserDto.roleId,
      provider: createUserDto.provider,
      socialId: createUserDto.socialId
    });
    return rs;
  }

  async findAll(includeDeleted = false) {
    const rs = await this.userModel.findAll<User>({ paranoid: !includeDeleted });
    return rs;
  }

  async findOne(id: number, includeDeleted = false) {
    const rs = await this.userModel.findByPk(id, { paranoid: !includeDeleted });
    return rs;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    await this.userModel.update({ ...updateUserDto }, { where: { id: id } })
    const rs = await this.userModel.findByPk(id);
    return rs;
  }

  async remove(id: number) {
    await this.userModel.destroy({ where: { id: id } })
      .catch(() => { return false })
    return true;
  }
}
