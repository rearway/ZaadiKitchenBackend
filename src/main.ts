import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module.js'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  )

  // CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  })

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Zaadi Kitchen API')
    .setDescription('Backend API for Zaadi Kitchen meal subscription platform')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT access token',
      },
      'JWT-auth'
    )
    .addTag('Authentication', 'OTP, Admin Login, Token Refresh, Logout')
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api', app, document)

  const port = process.env.PORT || 3000
  await app.listen(port)
  console.log(`🚀 Zaadi Kitchen API running on http://localhost:${port}`)
  console.log(`📚 Swagger UI: http://localhost:${port}/api`)
}
void bootstrap()
