
import { IsEmail, IsNotEmpty, Matches } from "class-validator";

export class CreateUserDto {
  firstname?: string;
  lastname?: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @Matches(/((84|0)[3|5|7|8|9])+([0-9]{8})\b/g, { message: 'Not VN phone number format' })
  phone?: string;

  role?: number;
  provider?: string;
  socialId?: string;
}
