import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException } from "@nestjs/common";
import { Observable, throwError } from "rxjs";
import { catchError, map } from "rxjs/operators";

export interface Response<T> {
  data: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => ({ data })),
      catchError((err) => throwError(() => {
        return new HttpException(
          {
            error: (err instanceof Error || err instanceof TypeError) ? ({ code: err?.name || 'InternalServerException', message: err?.message || 'Something went wrong'}) : err,
          },
          err.status || 500
        )}
      ))
    );
  }
}
