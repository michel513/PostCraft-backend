import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(@InjectQueue('post-scheduling') private postQueue: Queue) {}

  async schedulePost(postId: string, scheduledDate: Date) {
    const delay = scheduledDate.getTime() - Date.now();

    // If date is in the past, publish shortly (e.g. 1 second delay)
    const activeDelay = delay > 0 ? delay : 1000;

    this.logger.log(`Scheduling post ${postId} in ${activeDelay}ms`);

    await this.postQueue.add(
      'publish-post',
      { postId },
      {
        delay: activeDelay,
        jobId: postId, // Ensure only one job per post
        removeOnComplete: true,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );
  }

  async cancelScheduledPost(postId: string) {
    const job = await this.postQueue.getJob(postId);
    if (job) {
      await job.remove();
      this.logger.log(`Cancelled scheduled post ${postId}`);
    }
  }
}
