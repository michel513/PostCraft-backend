import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { SignupDto } from './dto/signup.dto';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { Prisma, User } from '../../generated/prisma/client';

interface TokenPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  async validateUser(
    email: string,
    pass: string,
  ): Promise<{ email: string; id: string; role: string } | null> {
    const user = await this.usersService.findOne({ email });
    if (user && (await bcrypt.compare(pass, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async getTokens(userId: string, email: string, role: string) {
    const payload: TokenPayload = {
      sub: userId,
      email,
      role,
    };

    const accessTokenOptions: JwtSignOptions = {
      secret: this.configService.get<string>('JWT_SECRET'),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expiresIn: (this.configService.get<string>('JWT_EXPIRATION') ||
        '15m') as any,
    };

    const refreshTokenOptions: JwtSignOptions = {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRATION') ||
        '7d') as any,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, accessTokenOptions),
      this.jwtService.signAsync(payload, refreshTokenOptions),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async login(user: { email: string; id: string; role: string }) {
    const tokens = await this.getTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refresh_token);
    return tokens;
  }

  async signup(data: SignupDto) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    const user = await this.usersService.create({
      ...data,
      password: hashedPassword,
      emailVerificationToken,
    });

    await this.mailService.sendUserConfirmation(user, emailVerificationToken);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  async verifyEmail(token: string) {
    const user = await this.usersService.findOne({
      emailVerificationToken: token,
    });
    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    await this.usersService.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
      },
    });

    return { message: 'Email verified successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findOne({ email });
    if (!user) {
      // We don't want to expose if a user exists or not for security
      return {
        message:
          'If an account with that email exists, we sent a password reset link',
      };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await this.usersService.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });

    await this.mailService.sendPasswordReset(user, resetToken);

    return {
      message:
        'If an account with that email exists, we sent a password reset link',
    };
  }

  async resetPassword(token: string, newPassword: Buffer | string) {
    const user = await this.usersService.findOne({
      passwordResetToken: token,
    });

    if (
      !user ||
      !user.passwordResetExpires ||
      user.passwordResetExpires < new Date()
    ) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.usersService.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return { message: 'Password reset successful' };
  }

  async updateRefreshToken(userId: string, refreshToken: string | null) {
    let hashedRefreshToken: string | null = null;
    if (refreshToken) {
      hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    }
    await this.usersService.update({
      where: { id: userId },
      data: { refreshToken: hashedRefreshToken },
    });
  }

  async logout(userId: string) {
    await this.updateRefreshToken(userId, null);
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findOne({ id: userId });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Access Denied');
    }

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );

    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Access Denied');
    }

    const tokens = await this.getTokens(user.id, user.email, String(user.role));
    await this.updateRefreshToken(user.id, tokens.refresh_token);
    return tokens;
  }

  async validateOAuthUser(profile: {
    email: string;
    firstName?: string;
    lastName?: string;
    googleId?: string;
    githubId?: string;
    facebookId?: string;
  }) {
    // 1. Build OR conditions dynamically to avoid undefined values in Prisma query
    const orConditions: Prisma.UserWhereInput[] = [];
    if (profile.googleId) orConditions.push({ googleId: profile.googleId });
    if (profile.githubId) orConditions.push({ githubId: profile.githubId });
    if (profile.facebookId)
      orConditions.push({ facebookId: profile.facebookId });

    // 2. Try to find user by any social ID
    let user: User | null = null;
    if (orConditions.length > 0) {
      user = await this.usersService.findFirst({
        OR: orConditions,
      });
    }

    if (user) {
      return user;
    }

    // 3. Try to find user by email
    user = await this.usersService.findOne({ email: profile.email });

    if (user) {
      // Link social ID to existing account
      return this.usersService.update({
        where: { id: user.id },
        data: {
          googleId: profile.googleId ?? user.googleId,
          githubId: profile.githubId ?? user.githubId,
          facebookId: profile.facebookId ?? user.facebookId,
          firstName: profile.firstName ?? user.firstName,
          lastName: profile.lastName ?? user.lastName,
          isEmailVerified: true,
        },
      });
    }

    // 4. Create new user if not found
    const randomPassword = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    return this.usersService.create({
      email: profile.email,
      password: hashedPassword,
      firstName: profile.firstName,
      lastName: profile.lastName,
      isEmailVerified: true, // Social login verifies email automatically
      googleId: profile.googleId,
      githubId: profile.githubId,
      facebookId: profile.facebookId,
    });
  }
}
