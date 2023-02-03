import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { User } from "./entities/user.entity";

@Injectable()
export class UsersService {
  constructor(
    @Inject("USERS_REPOSITORY")
    private usersRepository: typeof User
  ) {}

  async create(createUserDto: CreateUserDto) {
    let rs = await this.usersRepository.create({ ...createUserDto });
    return rs;
  }

  async findAll() {
    let rs = await this.usersRepository.findAll<User>();
    return rs;
  }

  async findOne(id: number) {
    let rs = await this.usersRepository.findByPk(id);
    if (rs === null) throw new NotFoundException(`Not found user with id #${id}`);
    return rs;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    await this.usersRepository.update({ ...updateUserDto }, { where: { id: id } })
    let rs = await this.usersRepository.findByPk(id);
    if (rs === null) throw new NotFoundException(`Not found user with id #${id}`);
    return rs;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
