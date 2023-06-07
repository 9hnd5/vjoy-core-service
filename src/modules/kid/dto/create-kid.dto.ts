import { Type } from "class-transformer";
import { IsNotEmpty, IsString, ValidateNested } from "class-validator";

class Character {
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  url: string;
}

export class CreateKidDto {
  @IsNotEmpty()
  parentId: number;

  @IsNotEmpty()
  @IsString()
  avatar: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => Character)
  character: Character;
}
