import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Enable CORS
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGINS')?.split(',') || '*',
    credentials: true,
  });

  const port = configService.get<number>('PORT') || 3020;
  await app.listen(port);

  console.log(`Worker Service running on port ${port}`);
  console.log(`Health check available at: http://localhost:${port}/health`);
  console.log(`Environment: ${configService.get<string>('NODE_ENV') || 'development'}`);
}

bootstrap();
