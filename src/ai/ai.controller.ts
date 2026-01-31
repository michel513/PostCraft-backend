import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AiService } from './ai.service';
import { GeneratePostDto, ImprovePostDto } from './dto/generate-post.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate a new LinkedIn post using AI' })
  @ApiResponse({ status: 201, description: 'Post generated successfully' })
  async generatePost(@Body() generatePostDto: GeneratePostDto) {
    return this.aiService.generatePost(generatePostDto);
  }

  @Post('improve')
  @ApiOperation({ summary: 'Improve an existing LinkedIn post using AI' })
  @ApiResponse({ status: 201, description: 'Post improved successfully' })
  async improvePost(@Body() improvePostDto: ImprovePostDto) {
    return this.aiService.improvePost(improvePostDto);
  }
}
