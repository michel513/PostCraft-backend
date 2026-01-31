import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { Post, PostStatus } from 'generated/prisma/client';
import { LinkedInService } from '../linkedin/linkedin.service';
import { SchedulingService } from '../scheduling/scheduling.service';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    private prisma: PrismaService,
    private linkedinService: LinkedInService,
    private schedulingService: SchedulingService,
  ) {}

  async create(userId: string, dto: CreatePostDto): Promise<Post> {
    const { content, linkedinId, scheduledAt } = dto;

    const post = await this.prisma.post.create({
      data: {
        content,
        linkedinId,
        authorId: userId,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: scheduledAt ? PostStatus.SCHEDULED : PostStatus.DRAFT,
      },
    });

    if (scheduledAt) {
      await this.schedulingService.schedulePost(post.id, new Date(scheduledAt));
    }

    return post;
  }

  async findAll(userId: string): Promise<Post[]> {
    return this.prisma.post.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<Post | null> {
    return this.prisma.post.findUnique({
      where: { id },
    });
  }

  async update(id: string, dto: Partial<CreatePostDto>): Promise<Post> {
    const post = await this.prisma.post.update({
      where: { id },
      data: {
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        status: dto.scheduledAt ? PostStatus.SCHEDULED : undefined,
      },
    });

    if (dto.scheduledAt) {
      await this.schedulingService.schedulePost(
        post.id,
        new Date(dto.scheduledAt),
      );
    } else if (dto.scheduledAt === null) {
      await this.schedulingService.cancelScheduledPost(id);
    }

    return post;
  }

  async remove(id: string): Promise<Post> {
    await this.schedulingService.cancelScheduledPost(id);
    return this.prisma.post.delete({
      where: { id },
    });
  }

  async publish(id: string, userId: string): Promise<Post> {
    const post = await this.prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new Error('Post not found');
    }

    if (post.authorId !== userId) {
      throw new Error('Unauthorized');
    }

    try {
      const result = await this.linkedinService.publishPost(
        userId,
        post.content,
      );
      const linkedinId = result.id;

      return await this.prisma.post.update({
        where: { id },
        data: {
          isPublished: true,
          status: PostStatus.PUBLISHED,
          linkedinId,
          publishedAt: new Date(),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Manual publication failed for post ${id}: ${message}`);

      await this.prisma.post.update({
        where: { id },
        data: { status: PostStatus.FAILED },
      });

      throw error;
    }
  }
}
