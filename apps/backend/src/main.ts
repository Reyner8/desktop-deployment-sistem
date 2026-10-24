import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Header HTTP keamanan standar untuk API yang diakses browser.
  app.use(helmet());

  app.setGlobalPrefix('api/v1');

  // API reference (OpenAPI) hanya di luar produksi; dokumentasi tidak
  // boleh terekspos di internet. Decorator swagger di-generate otomatis
  // oleh plugin nest-cli (@nestjs/swagger) dari tipe DTO.
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('RSCB Deployment System API')
      .setDescription(
        'API deployment SIMRS. Endpoint agent memakai header x-api-key ' +
          '(token device dari /agents/register); endpoint CI memakai x-api-key ' +
          'CI_API_KEY; sisanya JWT Bearer dari /auth/login. ' +
          'Catatan kontrak: cek update adalah GET /agents/updates (device ' +
          'diidentifikasi dari token, bukan path param) dan laporan status ' +
          'adalah POST /agents/deployments/:id/status.',
      )
      .setVersion('0.1.0')
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'device-token')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  app.useGlobalFilters(new ApiExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Backend running on port ${port}`);
}
bootstrap();