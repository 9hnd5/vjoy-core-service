import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const config = new DocumentBuilder()
    .setTitle("Vjoy-Core")
    .setDescription("The documentation vjoy-core")
    .setVersion("1.0")
    .addTag("vjoy-core")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api-docs", app, document);
  await app.listen(parseInt(process.env.PORT as string));
}
bootstrap();
