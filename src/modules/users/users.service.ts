import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { User } from "./entities/user.entity";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User)
    private userModel: typeof User
  ) {}

  async create(createUserDto: CreateUserDto) {
    let rs = await this.userModel.create({ ...createUserDto });
    return rs;
  }

  async findAll() {
    let rs = await this.userModel.findAll<User>();
    return rs;
  }

  async findOne(id: number) {
    let rs = await this.userModel.findByPk(id);
    if (rs === null) throw new NotFoundException(`Not found user with id #${id}`);
    return rs;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    await this.userModel.update({ ...updateUserDto }, { where: { id: id } })
    let rs = await this.userModel.findByPk(id);
    if (rs === null) throw new NotFoundException(`Not found user with id #${id}`);
    return rs;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
