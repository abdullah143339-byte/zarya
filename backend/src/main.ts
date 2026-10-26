import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import { join } from 'path';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api/v1');
  (app.getHttpAdapter().getInstance() as express.Express).set('trust proxy', true);

  // Multi-instance scaling: use Redis-backed Socket.io adapter when REDIS_URL is set.
  const redisUrl = configService.get<string>('REDIS_URL');
  if (redisUrl) {
    const redisIoAdapter = new RedisIoAdapter(app);
    try {
      await redisIoAdapter.connectToRedis(redisUrl);
      app.useWebSocketAdapter(redisIoAdapter);
      logger.log(`Socket.io running with Redis adapter (${redisUrl})`);
    } catch (err) {
      logger.warn(`Redis adapter failed to connect (${redisUrl}), falling back to in-memory adapter: ${err}`);
    }
  }

  app.enableCors({
    origin: configService.get<string>('CORS_ORIGINS')?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  app.use(cookieParser());
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        mediaSrc: ["'self'", "blob:"],
        connectSrc: ["'self'", "https:", "wss:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
    noSniff: true,
    frameguard: { action: "deny" },
    xssFilter: true,
    hidePoweredBy: true,
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
  }));

  // Security headers + rate limiting applied via AppModule.configure()

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('NOVAX API')
    .setDescription('NOVAX · Think Beyond Social — AI-First Social Media Ecosystem')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication', 'User authentication & session management')
    .addTag('Users', 'User profiles & social features')
    .addTag('Posts', 'Content creation & feed')
    .addTag('Messages', 'Real-time messaging')
    .addTag('Communities', 'Community management')
    .addTag('Marketplace', 'Digital marketplace')
    .addTag('Learning', 'Personal Learning Hub workspace')
    .addTag('AI', 'NOVAX assistant & agents')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const uploadsDir = join(process.cwd(), 'data', 'uploads');
  const fs = await import('fs');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  const port = configService.get<number>('APP_PORT') || 8080;
  await app.listen(port);
  console.log(`🚀 NOVAX Backend running on http://localhost:${port}`);
  console.log(`📚 API Docs: http://localhost:${port}/docs`);
}

bootstrap();
