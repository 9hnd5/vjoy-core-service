import { IsNotEmpty, IsString } from "class-validator";

export class CreateKidDto {
  @IsNotEmpty()
  parentId: number;

  @IsNotEmpty()
  @IsString()
  avatar: string;

  @IsNotEmpty()
  character: string;
}
