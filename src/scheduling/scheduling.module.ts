import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SchedulingService } from './scheduling.service';
import { SchedulingProcessor } from './scheduling.processor';
import { LinkedInModule } from '../linkedin/linkedin.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>('REDIS_URL'),
        },
      }),
    }),
    BullModule.registerQueue({
      name: 'post-scheduling',
    }),
    LinkedInModule,
    PrismaModule,
  ],
  providers: [SchedulingService, SchedulingProcessor],
  exports: [SchedulingService],
})
export class SchedulingModule {}
