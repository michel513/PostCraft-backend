import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { LinkedInService } from '../linkedin/linkedin.service';
import { PrismaService } from '../prisma/prisma.service';
import { PostStatus } from '@prisma/client';

interface JobData {
  postId: string;
}

@Processor('post-scheduling')
export class SchedulingProcessor extends WorkerHost {
  private readonly logger = new Logger(SchedulingProcessor.name);

  constructor(
    private linkedinService: LinkedInService,
    private prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<JobData, void, string>): Promise<void> {
    const { postId } = job.data;
    this.logger.log(`Processing publication for post ${postId}`);

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { author: true },
    });

    if (!post) {
      this.logger.error(`Post ${postId} not found`);
      return;
    }

    if (post.isPublished || post.status === PostStatus.PUBLISHED) {
      this.logger.warn(`Post ${postId} is already published`);
      return;
    }

    try {
      await this.linkedinService.publishPost(post.authorId, post.content);

      await this.prisma.post.update({
        where: { id: postId },
        data: {
          status: PostStatus.PUBLISHED,
          isPublished: true,
          publishedAt: new Date(),
        },
      });

      this.logger.log(`Successfully published post ${postId} to LinkedIn`);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : JSON.stringify(error);
      this.logger.error(`Failed to publish post ${postId}: ${message}`);

      await this.prisma.post.update({
        where: { id: postId },
        data: {
          status: PostStatus.FAILED,
        },
      });

      throw error; // Rethrow to trigger BullMQ retry
    }
  }
}
