/* eslint-disable @typescript-eslint/ban-types */
import { ArgumentMetadata, BadRequestException, PipeTransform } from "@nestjs/common";
import { plainToInstance } from "class-transformer";

export class RouteValidation implements PipeTransform {
  async transform(value: any, metadata: ArgumentMetadata) {
    const { type, metatype, data } = metadata;

    if (type !== "param" || !metatype) {
      return value;
    }

    const object = plainToInstance(metatype, value);
    if (!object) throw new BadRequestException(`Route params(${data}) is not valid`);

    return value;
  }
}
