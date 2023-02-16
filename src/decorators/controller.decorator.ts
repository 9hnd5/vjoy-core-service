import { applyDecorators, Controller as NestController } from "@nestjs/common";

type NestControllerOption = Parameters<typeof NestController>[0];
type ControllerOption = NestControllerOption | string | string[];

const isNestControllerOption = (param: NestControllerOption | string | string[]): param is NestControllerOption => {
  if (typeof param === "string") return false;
  if ("path" in param || "host" in param || "scope" in param || "durable" in param || "version" in param) return true;
  return false;
};
/**
 * The default API version is 1. Use the version option to specify the new version
 */
export function Controller(options?: ControllerOption) {
  if (!options) return applyDecorators(NestController());

  if (!isNestControllerOption(options)) {
    const mapPath =
      typeof options === "string"
        ? `${process.env.NODE_ENV}/core/${options}`
        : options.map((x) => `${process.env.NODE_ENV}/core/${x}`);

    return applyDecorators(NestController({ path: mapPath, version: "1" }));
  }

  const { path, version = "1", ...rest } = options;
  const mapPath = `${process.env.NODE_ENV}/core/${path}`;
  return applyDecorators(NestController({ path: mapPath, version, ...rest }));
}
