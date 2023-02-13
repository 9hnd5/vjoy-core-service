import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException, UnprocessableEntityException } from "@nestjs/common";
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
        let error: any;
        if (err instanceof Error || err instanceof TypeError) error = ({ code: err?.name || 'InternalServerException', message: err?.message || 'Something went wrong'});
        if (err instanceof UnprocessableEntityException) {
          const errRes: any = err.getResponse();
          const errArr = this.flattenChildren(errRes.message);
          error = [];
          errArr.forEach(e => {
            if(e.constraints !== undefined) {
              const constraints: any = e.constraints;
              error.push({ code: e.property, message: Object.values(constraints)[0] })
            }
          })
        }
        
        return new HttpException(
          {
            error,
          },
          err.status || 500
        )}
      ))
    );
  }

  private flattenChildren(arr: any): any {
    return arr.flatMap(({ children, ...o }: { children: any; o: any }) => [
      o,
      ...this.flattenChildren(children),
    ])
  }
}
