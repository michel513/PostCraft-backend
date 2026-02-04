import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { LinkedInModule } from '../linkedin/linkedin.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CaslModule } from '../casl/casl.module';

@Module({
  imports: [PrismaModule, LinkedInModule, SchedulingModule, CaslModule],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
