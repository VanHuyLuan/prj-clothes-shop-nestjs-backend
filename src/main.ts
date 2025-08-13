import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: '*',
    credentials: true,
  });

  // Swagger config
  const config = new DocumentBuilder()
    .setTitle('Clothes Shop API')
    .setDescription('API cho cửa hàng quần áo')
    .setVersion('1.0')
    .addBearerAuth() // thêm auth header cho Swagger
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // Swagger UI tại http://localhost:4000/api

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
