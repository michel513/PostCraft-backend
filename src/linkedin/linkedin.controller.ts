import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LinkedInService } from './linkedin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Response } from 'express';
import { LinkedInCallbackDto } from './dto/linkedin-auth.dto';

@ApiTags('linkedin')
@Controller('linkedin')
export class LinkedInController {
  constructor(private readonly linkedinService: LinkedInService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('auth-url')
  @ApiOperation({ summary: 'Get LinkedIn authorization URL' })
  @ApiResponse({ status: 200, description: 'Return LinkedIn OAuth URL' })
  getAuthUrl() {
    return { url: this.linkedinService.getAuthorizationUrl() };
  }

  @Get('callback')
  @ApiOperation({ summary: 'LinkedIn OAuth callback' })
  @ApiResponse({
    status: 302,
    description: 'Redirect to frontend success/error page',
  })
  async callback(@Query() query: LinkedInCallbackDto, @Res() res: Response) {
    const { code, state: userId } = query;

    if (!code || !userId) {
      return res.redirect(`${process.env.FRONTEND_URL}/linkedin/error`);
    }

    try {
      await this.linkedinService.handleCallback(code, userId);
      return res.redirect(`${process.env.FRONTEND_URL}/linkedin/success`);
    } catch {
      return res.redirect(`${process.env.FRONTEND_URL}/linkedin/error`);
    }
  }
}
