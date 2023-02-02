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

  create(createUserDto: CreateUserDto) {
    return "This action adds a new user";
  }

  async findAll() {
    let rs = await this.usersRepository.findAll<User>();
    console.log(rs);
    return rs;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;

    // throw new NotFoundException("not find user with id #${id}");
    
    // const errors:any[] = [];
    // errors.push({ 'firstname': 'already exist' });
    // errors.push({ 'email': 'wrong format' });
    // throw errors;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
