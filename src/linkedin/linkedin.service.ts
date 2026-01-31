import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
}

interface LinkedInProfileResponse {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
}

interface LinkedInPostResponse {
  id: string;
}

@Injectable()
export class LinkedInService {
  private readonly logger = new Logger(LinkedInService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.clientId = this.configService.get<string>('LINKEDIN_CLIENT_ID') || '';
    this.clientSecret =
      this.configService.get<string>('LINKEDIN_CLIENT_SECRET') || '';
    this.redirectUri =
      this.configService.get<string>('LINKEDIN_REDIRECT_URI') || '';
  }

  getAuthorizationUrl(): string {
    const scope = encodeURIComponent('w_member_social profile openid email');
    return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${this.clientId}&redirect_uri=${encodeURIComponent(
      this.redirectUri,
    )}&scope=${scope}`;
  }

  async handleCallback(code: string, userId: string) {
    try {
      // 1. Exchange code for access token
      const tokenResponse = await axios.post<LinkedInTokenResponse>(
        'https://www.linkedin.com/oauth/v2/accessToken',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const { access_token, refresh_token, expires_in } = tokenResponse.data;
      const expiresAt = new Date(Date.now() + expires_in * 1000);

      // 2. Get Person URN
      const profileResponse = await axios.get<LinkedInProfileResponse>(
        'https://api.linkedin.com/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        },
      );

      const linkedinId = profileResponse.data.sub;

      // 3. Store in database
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          linkedinAccessToken: access_token,
          linkedinRefreshToken: refresh_token,
          linkedinTokenExpiresAt: expiresAt,
          linkedinId: linkedinId,
        },
      });

      return { success: true };
    } catch (error) {
      this.handleAxiosError(error, 'LinkedIn callback failed');
      throw new Error('LinkedIn authentication failed');
    }
  }

  async refreshAccessToken(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.linkedinRefreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post<LinkedInTokenResponse>(
        'https://www.linkedin.com/oauth/v2/accessToken',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: user.linkedinRefreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const { access_token, refresh_token, expires_in } = response.data;
      const expiresAt = new Date(Date.now() + expires_in * 1000);

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          linkedinAccessToken: access_token,
          linkedinRefreshToken: refresh_token || user.linkedinRefreshToken,
          linkedinTokenExpiresAt: expiresAt,
        },
      });

      this.logger.log(
        `Successfully refreshed LinkedIn token for user ${userId}`,
      );
      return access_token;
    } catch (error) {
      this.handleAxiosError(error, 'LinkedIn token refresh failed');
      throw new Error('Failed to refresh LinkedIn token');
    }
  }

  async publishPost(
    userId: string,
    content: string,
  ): Promise<LinkedInPostResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.linkedinAccessToken || !user.linkedinId) {
      throw new Error('LinkedIn not connected');
    }

    // Check if token is expired or close to expiration (e.g. 5 minutes)
    let accessToken = user.linkedinAccessToken;
    if (
      user.linkedinTokenExpiresAt &&
      user.linkedinTokenExpiresAt.getTime() < Date.now() + 5 * 60 * 1000
    ) {
      accessToken = await this.refreshAccessToken(userId);
    }

    try {
      const response = await axios.post<LinkedInPostResponse>(
        'https://api.linkedin.com/v2/ugcPosts',
        {
          author: `urn:li:person:${user.linkedinId}`,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text: content,
              },
              shareMediaCategory: 'NONE',
            },
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      this.handleAxiosError(error, 'LinkedIn publication failed');
      throw new Error('Failed to publish post to LinkedIn');
    }
  }

  private handleAxiosError(error: unknown, context: string) {
    if (axios.isAxiosError(error)) {
      this.logger.error(
        `${context}: ${error.response?.status} - ${JSON.stringify(error.response?.data) || error.message}`,
      );
    } else {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : JSON.stringify(error);
      this.logger.error(`${context}: ${message}`);
    }
  }
}
