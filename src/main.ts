import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { join } from "path";
import { NestExpressApplication } from "@nestjs/platform-express";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();
  app.enableVersioning();
  app.setGlobalPrefix("api");
  app.setBaseViewsDir(join(__dirname, "views"));
  app.setViewEngine("hbs");
  const config = new DocumentBuilder()
    .addBearerAuth()
    .setTitle("Vjoy-Core")
    .setDescription("The documentation vjoy-core")
    .setVersion("1.0")
    .addTag("vjoy-core")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/v1/dev/core/api-docs", app, document);
  await app.listen(parseInt(process.env.PORT as string));
}
bootstrap();
