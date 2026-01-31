import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { JwtRefreshGuard } from './jwt-refresh.guard';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

interface RequestWithUser extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
    refreshToken?: string;
  };
}

interface OAuthRequest extends Request {
  user: {
    email: string;
    firstName?: string;
    lastName?: string;
    googleId?: string;
    githubId?: string;
    facebookId?: string;
    picture?: string;
    accessToken?: string;
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and receive access & refresh tokens' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      return { message: 'Invalid credentials', statusCode: 401 };
    }
    return this.authService.login(user);
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh tokens using a valid refresh token' })
  @ApiResponse({ status: 200, description: 'Tokens rotated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async refresh(@Request() req: RequestWithUser) {
    const userId = req.user.sub;
    const refreshToken = req.user.refreshToken;
    if (!refreshToken) {
      return { message: 'Refresh token missing', statusCode: 401 };
    }
    return this.authService.refreshTokens(userId, refreshToken);
  }

  @UseGuards(JwtRefreshGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiResponse({ status: 204, description: 'Logout successful' })
  async logout(@Request() req: RequestWithUser) {
    await this.authService.logout(req.user.sub);
  }

  // --- Email Flows ---

  @Get('verify-email')
  @ApiOperation({ summary: 'Verify user email using a token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid token' })
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset link' })
  @ApiResponse({ status: 200, description: 'Reset link sent if email exists' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using a token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }

  // --- Social Logins ---

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth2 login' })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async googleAuth(@Request() req: any) {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth2 callback redirect' })
  async googleAuthRedirect(@Request() req: OAuthRequest, @Res() res: Response) {
    const user = await this.authService.validateOAuthUser(req.user);
    const tokens = await this.authService.login({
      id: user.id,
      email: user.email,
      role: String(user.role),
    });
    return res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token}`,
    );
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'Initiate GitHub OAuth2 login' })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async githubAuth(@Request() req: any) {}

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'GitHub OAuth2 callback redirect' })
  async githubAuthRedirect(@Request() req: OAuthRequest, @Res() res: Response) {
    const user = await this.authService.validateOAuthUser(req.user);
    const tokens = await this.authService.login({
      id: user.id,
      email: user.email,
      role: String(user.role),
    });
    return res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token}`,
    );
  }

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ summary: 'Initiate Facebook OAuth2 login' })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async facebookAuth(@Request() req: any) {}

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ summary: 'Facebook OAuth2 callback redirect' })
  async facebookAuthRedirect(
    @Request() req: OAuthRequest,
    @Res() res: Response,
  ) {
    const user = await this.authService.validateOAuthUser(req.user);
    const tokens = await this.authService.login({
      id: user.id,
      email: user.email,
      role: String(user.role),
    });
    return res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token}`,
    );
  }
}
