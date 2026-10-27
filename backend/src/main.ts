import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import {ValidationPipe} from "@nestjs/common";

const VITE_PORT = 5173
const APP_PORT = 3000

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for the React frontend (Vite defaults to port 5173)
  app.enableCors({
    origin: `http://localhost:${VITE_PORT}`,
  });

  // Enforce strict DTO payload validation across all controllers
  app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,            // Strips properties not defined in DTOs
        forbidNonWhitelisted: true, // Rejects requests containing unknown fields
        transform: true,            // Automatically converts payloads to DTO instances
      }),
  );

  const port = process.env.PORT ?? APP_PORT
  await app.listen(port);
  console.log(`StockPulse API running on http://localhost:${port}`);
}
await bootstrap();
