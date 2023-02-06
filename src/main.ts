import { UnprocessableEntityException, ValidationError, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ResponseInterceptor } from "./interceptors/response.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      errorHttpStatusCode: 422,
      whitelist: false,
    })
  );
  await app.listen(3000);
}
bootstrap();
