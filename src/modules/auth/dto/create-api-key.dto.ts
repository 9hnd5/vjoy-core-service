import { Exclude, Expose } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";

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
  @Matches(/vjoy-(web|mobile)/)
  type: string;
}
