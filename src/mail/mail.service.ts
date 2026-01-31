import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { User } from '../../generated/prisma/client';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
    });
  }

  async sendUserConfirmation(user: User, token: string) {
    const url = `${this.configService.get<string>('FRONTEND_URL')}/auth/verify-email?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('MAIL_FROM'),
        to: user.email,
        subject: 'Welcome to PostCraft! Confirm your Email',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #0a66c2; text-align: center;">Welcome to PostCraft!</h2>
            <p>Hello ${user.firstName || 'there'},</p>
            <p>Thank you for joining our platform. We're excited to have you on board! To get started, please confirm your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${url}" style="background-color: #0a66c2; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Confirm My Email</a>
            </div>
            <p style="font-size: 14px; color: #666;">If the button above doesn't work, copy and paste this link into your browser:</p>
            <p style="font-size: 12px; word-break: break-all;"><a href="${url}" style="color: #0a66c2;">${url}</a></p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="font-size: 12px; color: #999; text-align: center;">If you did not create an account with us, please ignore this email.</p>
          </div>
        `,
      });
      this.logger.log(`Confirmation email sent to ${user.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send confirmation email to ${user.email}`,
        error,
      );
      throw error;
    }
  }

  async sendPasswordReset(user: User, token: string) {
    const url = `${this.configService.get<string>('FRONTEND_URL')}/auth/reset-password?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('MAIL_FROM'),
        to: user.email,
        subject: 'PostCraft - Reset Your Password',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #0a66c2; text-align: center;">Password Reset Request</h2>
            <p>Hello ${user.firstName || 'there'},</p>
            <p>We received a request to reset your password for your PostCraft account. You can reset it by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${url}" style="background-color: #0a66c2; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
            </div>
            <p style="font-size: 14px; color: #666;">This link is valid for 1 hour. If you did not request this, you can safely ignore this email.</p>
            <p style="font-size: 14px; color: #666;">Copy and paste this link if the button doesn't work:</p>
            <p style="font-size: 12px; word-break: break-all;"><a href="${url}" style="color: #0a66c2;">${url}</a></p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="font-size: 12px; color: #999; text-align: center;">PostCraft Team</p>
          </div>
        `,
      });
      this.logger.log(`Password reset email sent to ${user.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${user.email}`,
        error,
      );
      throw error;
    }
  }
}
