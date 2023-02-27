import { ArgumentsHost, Catch, HttpException, HttpStatus } from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";

export type ErrorType = {
  code: string | number;
  message: string;
};
export class ErrorResponse {
  error: ErrorType | ErrorType[];
  constructor(code?: string | number, message?: string) {
    if (code && message) this.error = { code, message };
    else this.error = [];
  }
  pushError(code: string | number, message: any) {
    if (!Array.isArray(this.error)) return;
    this.error.push({ code, message });
  }
}

@Catch()
export class GlobalExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse() as
        | { statusCode: number; message: string | string[]; error: string }
        | string;

      // If the response is a string, create a single error object with the status and message
      if (typeof response === "string")
        return super.catch(new HttpException(new ErrorResponse(status, response), status), host);

      // If the response is an object with a string message, create a single error object with the status and message
      // It likely throw by user with string payload(ex: new BadRequestException("error message"))
      if (typeof response === "object" && typeof response.message === "string")
        return super.catch(new HttpException(new ErrorResponse(status, response.message), status), host);

      // If the response is an object with an array of messages, create an error response with multiple error objects
      // It likely throw by ValidationPipe
      if (typeof response === "object" && Array.isArray(response.message)) {
        const { message: errorMessages } = response;
        const errorResponse = new ErrorResponse();

        for (const errorMessage of errorMessages) {
          const index = errorMessage.indexOf(" ");
          const errorField = errorMessage.substring(0, index);
          errorResponse.pushError(errorField, errorMessage);
        }

        return super.catch(new HttpException(errorResponse, status), host);
      }

      // If the response is an object with other fields, create an error response with multiple error objects
      // It likely throw by user with object payload(ex: new BadRequestException({firstname: "firstname should not empty"}))
      const errorResponse = new ErrorResponse();
      for (const [key, value] of Object.entries(response)) {
        errorResponse.pushError(key, value);
      }

      return super.catch(new HttpException(errorResponse, status), host);
    }

    // If the exception is not an HttpException, create an error response with the exception message and stack trace
    return super.catch(
      new HttpException(
        new ErrorResponse(
          HttpStatus.INTERNAL_SERVER_ERROR,
          JSON.stringify(exception, Object.getOwnPropertyNames(exception))
        ),
        HttpStatus.INTERNAL_SERVER_ERROR
      ),
      host
    );
  }
}
