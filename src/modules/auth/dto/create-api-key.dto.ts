import { Allow, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateApiKeyDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  description?: string;

  @Allow()
  // @Matches(/vjoy-(web|mobile|test)/)
  type: string;
}
