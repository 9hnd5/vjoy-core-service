import { ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { ErrorResponse, GlobalExceptionFilter } from "./global-exception.filter";

describe("GlobalExceptionFilter", () => {
  let filter: GlobalExceptionFilter;
  let catchSpy: jest.SpyInstance;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GlobalExceptionFilter],
    }).compile();
    catchSpy = jest.spyOn(BaseExceptionFilter.prototype, "catch").mockImplementation(jest.fn);
    filter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter);
  });

  it("should be defined", () => {
    expect(filter).toBeDefined();
  });

  it("should handle HttpException with with string payload", () => {
    const exception = new HttpException("error message", HttpStatus.BAD_REQUEST);
    const host = {} as ArgumentsHost;

    filter.catch(exception, host);

    expect(catchSpy).toHaveBeenCalledWith(
      expect.objectContaining(
        new HttpException(new ErrorResponse(HttpStatus.BAD_REQUEST, "error message"), HttpStatus.BAD_REQUEST)
      ),
      host
    );
  });

  it("should handle HttpException with with object payload", () => {
    const exception = new HttpException({ firstname: "firstname should not be empty" }, HttpStatus.BAD_REQUEST);
    const host = {} as ArgumentsHost;

    filter.catch(exception, host);

    const errorResponse = new ErrorResponse();
    errorResponse.pushError("firstname", "firstname should not be empty");

    expect(catchSpy).toHaveBeenCalledWith(
      expect.objectContaining(new HttpException(errorResponse, HttpStatus.BAD_REQUEST)),
      host
    );
  });

  it("should handle HttpException with throw by ValidationPipe", () => {
    const exception = new HttpException(
      { message: ["firstname should not be empty", "email must be an email"] },
      HttpStatus.BAD_REQUEST
    );
    const host = {} as ArgumentsHost;

    filter.catch(exception, host);

    const errorResponse = new ErrorResponse();
    errorResponse.pushError("firstname", "firstname should not be empty");
    errorResponse.pushError("email", "email must be an email");

    expect(catchSpy).toHaveBeenCalledWith(
      expect.objectContaining(new HttpException(errorResponse, HttpStatus.BAD_REQUEST)),
      host
    );
  });

  it("should handle unknown exception", () => {
    const exception = new Error("error message");
    const host = {} as ArgumentsHost;

    filter.catch(exception, host);

    expect(catchSpy).toHaveBeenCalledWith(
      new HttpException(
        new ErrorResponse(
          HttpStatus.INTERNAL_SERVER_ERROR,
          JSON.stringify(exception, Object.getOwnPropertyNames(exception))
        ),
        HttpStatus.INTERNAL_SERVER_ERROR
      ),
      host
    );
  });
});
