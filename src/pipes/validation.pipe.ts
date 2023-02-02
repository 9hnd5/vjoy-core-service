import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException, Optional } from "@nestjs/common";
import { validate, ValidatorOptions } from "class-validator";
import { plainToClass, ClassTransformOptions, instanceToPlain } from "class-transformer";

const isUndefined = (obj: any): obj is undefined => typeof obj === "undefined";

const isNil = (val: any): val is null | undefined => isUndefined(val) || val === null;

interface ValidationPipeOptions extends ValidatorOptions {
  transform?: boolean;
  transformOptions?: ClassTransformOptions;
  validateCustomDecorators?: boolean;
}

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  protected isTransformEnabled: boolean;
  protected transformOptions: ClassTransformOptions | undefined;
  protected validatorOptions: ValidatorOptions;
  protected validateCustomDecorators: boolean;

  constructor(@Optional() options?: ValidationPipeOptions) {
    options = options || {};
    const { transform, transformOptions, validateCustomDecorators, ...validatorOptions } = options;

    this.isTransformEnabled = !!transform;
    this.transformOptions = transformOptions;
    this.validatorOptions = validatorOptions;
    this.validateCustomDecorators = validateCustomDecorators || false;
  }

  async transform(value: any, metadata: ArgumentMetadata) {
    const metatype = metadata.metatype;
    if (!metatype || !this.toValidate(metadata)) {
      return this.isTransformEnabled ? this.transformPrimitive(value, metadata) : value;
    }

    const originalValue = value;
    value = this.toEmptyIfNil(value);

    const isNil = value !== originalValue;
    const isPrimitive = this.isPrimitive(value);
    let object = plainToClass(metatype, value, this.transformOptions);

    const originalEntity = object;
    const isCtorNotEqual = object.constructor !== metatype;

    if (isCtorNotEqual && !isPrimitive) {
      object.constructor = metatype;
    } else if (isCtorNotEqual) {
      // when "entity" is a primitive value, we have to temporarily
      // replace the entity to perform the validation against the original
      // metatype defined inside the handler
      object = { constructor: metatype };
    }

    const errors = await validate(object, this.validatorOptions);
    if (errors.length > 0) {
      console.log(errors);

      throw new BadRequestException("Validation failed");
    }

    if (isPrimitive) {
      // if the value is a primitive value and the validation process has been successfully completed
      // we have to revert the original value passed through the pipe
      object = originalEntity;
    }

    if (this.isTransformEnabled) {
      return object;
    }

    if (isNil) {
      // if the value was originally undefined or null, revert it back
      return originalValue;
    }
    return Object.keys(this.validatorOptions).length > 0 ? instanceToPlain(object, this.transformOptions) : value;
  }

  protected isPrimitive(value: unknown): boolean {
    return ["number", "boolean", "string"].includes(typeof value);
  }

  protected transformPrimitive(value: any, metadata: ArgumentMetadata) {
    if (!metadata.data) {
      // leave top-level query/param objects unmodified
      return value;
    }
    const { type, metatype } = metadata;
    if (type !== "param" && type !== "query") {
      return value;
    }
    if (metatype === Boolean) {
      return value === true || value === "true";
    }
    if (metatype === Number) {
      return +value;
    }
    return value;
  }

  protected toEmptyIfNil<T = any>(value: T): T | {} {
    return isNil(value) ? {} : value;
  }

  protected toValidate(metadata: ArgumentMetadata): boolean {
    const { metatype, type } = metadata;
    if (type === "custom" && !this.validateCustomDecorators) {
      return false;
    }
    const types = [String, Boolean, Number, Array, Object, Buffer];
    return !types.some((t) => metatype === t) && !isNil(metatype);
  }
}
