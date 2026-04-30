import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  // Refuse to start if JWT_SECRET is missing — health data must be protected
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set. Refusing to start.')
  }

  const app = await NestFactory.create(AppModule)

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://steady.hnscorpph.com',
      'https://steady.vercel.app',
    ],
    credentials: true,
  })

  // Railway health check
  const httpAdapter = app.getHttpAdapter()
  httpAdapter.get('/health', (_req: unknown, res: { json: (o: unknown) => void }) => {
    res.json({ status: 'ok', app: 'steady-api' })
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  const config = new DocumentBuilder()
    .setTitle('Steady API')
    .setDescription('Privacy-first epilepsy family safety API. Every query is isolated by HouseholdID.')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('docs', app, document)

  const port = process.env.PORT ?? 3001
  await app.listen(port)
  console.log(`Steady API running on port ${port}`)
  console.log(`Swagger docs: http://localhost:${port}/docs`)
}

bootstrap()
