import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import {ValidationPipe} from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for the React frontend (Vite defaults to port 5173)
  app.enableCors({
    origin: ['http://localhost:5173'],
  });

  // Enforce strict DTO payload validation across all controllers
  app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,            // Strips properties not defined in DTOs
        forbidNonWhitelisted: true, // Rejects requests containing unknown fields
        transform: true,            // Automatically converts payloads to DTO instances
      }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`StockPulse API running on http://localhost:${port}`);
}
await bootstrap();
