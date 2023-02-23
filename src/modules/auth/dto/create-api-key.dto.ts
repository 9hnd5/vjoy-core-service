import { Exclude, Expose } from "class-transformer";
import { Allow, IsNotEmpty, IsOptional, IsString } from "class-validator";

@Exclude()
export class CreateApiKeyDto {
  @Expose()
  @IsNotEmpty()
  @IsString()
  name: string;

  @Expose()
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  description?: string;

  @Expose()
  @Allow()
  // @Matches(/vjoy-(web|mobile)/)
  type: string;
}
