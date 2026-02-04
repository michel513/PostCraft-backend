import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import * as Joi from 'joi';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PostsModule } from './posts/posts.module';
import { PaymentsModule } from './payments/payments.module';
import { AiModule } from './ai/ai.module';
import { LinkedInModule } from './linkedin/linkedin.module';
import { CaslModule } from './casl/casl.module';
import { SchedulingModule } from './scheduling/scheduling.module';
import { MailModule } from './mail/mail.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRATION: Joi.string().default('15m'),
        JWT_REFRESH_SECRET: Joi.string().required(),
        JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),
        PORT: Joi.number().default(3000),
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        FRONTEND_URL: Joi.string().required(),
        BACKEND_URL: Joi.string().required(),
        GEMINI_API_KEY: Joi.string().required(),
        STRIPE_SECRET_KEY: Joi.string().required(),
        STRIPE_WEBHOOK_SECRET: Joi.string().required(),
        LINKEDIN_CLIENT_ID: Joi.string().required(),
        LINKEDIN_CLIENT_SECRET: Joi.string().required(),
        LINKEDIN_REDIRECT_URI: Joi.string().required(),
        PAYTECH_API_KEY: Joi.string().required(),
        PAYTECH_API_SECRET: Joi.string().required(),
        PAYTECH_ENV: Joi.string().valid('test', 'prod').default('test'),
        REDIS_URL: Joi.string().required(),
        MAIL_HOST: Joi.string().required(),
        MAIL_PORT: Joi.number().required(),
        MAIL_USER: Joi.string().allow('').optional(),
        MAIL_PASS: Joi.string().allow('').optional(),
        MAIL_FROM: Joi.string().required(),
        GOOGLE_CLIENT_ID: Joi.string().allow('').optional(),
        GOOGLE_CLIENT_SECRET: Joi.string().allow('').optional(),
        GOOGLE_CALLBACK_URL: Joi.string().allow('').optional(),
        GITHUB_CLIENT_ID: Joi.string().allow('').optional(),
        GITHUB_CLIENT_SECRET: Joi.string().allow('').optional(),
        GITHUB_CALLBACK_URL: Joi.string().allow('').optional(),
        FACEBOOK_CLIENT_ID: Joi.string().allow('').optional(),
        FACEBOOK_CLIENT_SECRET: Joi.string().allow('').optional(),
        FACEBOOK_CALLBACK_URL: Joi.string().allow('').optional(),
      }),
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => [
        {
          ttl: 60000, // 1 minute
          limit: 100, // 100 requests per minute
        },
      ],
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    PostsModule,
    PaymentsModule,
    AiModule,
    LinkedInModule,
    CaslModule,
    SchedulingModule,
    MailModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
