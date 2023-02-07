import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { AuthService } from "src/modules/auth/auth.service";
import { Role } from "src/modules/auth/entities/role.entity";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { User } from "./entities/user.entity";
import { EXCLUDE_FIELDS, USER_STATUS } from "./users.constants";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User) private userModel: typeof User,

    private readonly authService: AuthService
  ) {}

  async create(createUserDto: CreateUserDto) {
    const pass = await this.authService.createPassword('123456');
    const rs = await this.userModel.create({ 
      ...createUserDto,
      password: pass,
      status: USER_STATUS.ACTIVATED
    });
    return rs;
  }

  async findAll(query?, includeDeleted = false) {
    const rs = await this.userModel.findAndCountAll<User>({ attributes: {exclude: EXCLUDE_FIELDS}, include: Role, paranoid: !includeDeleted });
    return rs;
  }

  async findOne(id: number, includeDeleted = false) {
    const rs = await this.userModel.findByPk(id, { attributes: {exclude: EXCLUDE_FIELDS}, paranoid: !includeDeleted });
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
