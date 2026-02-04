import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PoliciesGuard } from '../common/guards/policies.guard';
import { CheckPolicies } from '../common/guards/policies.decorator';
import { Action } from '../casl/casl-ability.factory';
import { Role } from '@prisma/client';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    email: string;
    role: Role;
  };
}

@ApiTags('posts')
@ApiBearerAuth()
@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new post (can be scheduled)' })
  @ApiResponse({
    status: 201,
    description: 'Post created and potentially scheduled',
  })
  create(
    @Request() req: RequestWithUser,
    @Body() createPostDto: CreatePostDto,
  ) {
    return this.postsService.create(req.user.userId, createPostDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all posts for current user' })
  @ApiResponse({ status: 200, description: 'Return list of posts' })
  findAll(@Request() req: RequestWithUser) {
    return this.postsService.findAll(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific post' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Return the post' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a post' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Post updated successfully' })
  update(
    @Param('id') id: string,
    @Body() updatePostDto: Partial<CreatePostDto>,
  ) {
    return this.postsService.update(id, updatePostDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a post' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Post deleted successfully' })
  remove(@Param('id') id: string) {
    return this.postsService.remove(id);
  }

  @Post(':id/publish')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability) => ability.can(Action.Publish, 'Post'))
  @ApiOperation({ summary: 'Publish post to LinkedIn' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Post published successfully' })
  publish(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.postsService.publish(id, req.user.userId);
  }
}
