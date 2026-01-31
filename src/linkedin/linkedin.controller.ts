import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { LinkedInService } from './linkedin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Response } from 'express';

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
  @ApiQuery({ name: 'code', description: 'Authorization code from LinkedIn' })
  @ApiQuery({ name: 'state', description: 'User ID passed as state' })
  @ApiResponse({
    status: 302,
    description: 'Redirect to frontend success/error page',
  })
  async callback(
    @Query('code') code: string,
    @Query('state') userId: string, // We'll pass userId in state for simplicity in this flow
    @Res() res: Response,
  ) {
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
