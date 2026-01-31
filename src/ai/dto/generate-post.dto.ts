import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PostTone {
  PROFESSIONAL = 'professional',
  CASUAL = 'casual',
  INSPIRATIONAL = 'inspirational',
  EDUCATIONAL = 'educational',
}

export class GeneratePostDto {
  @ApiProperty({
    example: 'Artificial Intelligence in 2024',
    description: 'The topic for the post',
  })
  @IsString()
  prompt!: string;

  @ApiProperty({
    example: PostTone.PROFESSIONAL,
    description: 'The tone of the post',
    enum: PostTone,
    required: false,
  })
  @IsOptional()
  @IsEnum(PostTone)
  tone?: PostTone;

  @ApiProperty({
    example: 'AI, future, technology',
    description: 'Keywords to include',
    required: false,
  })
  @IsOptional()
  @IsString()
  keywords?: string;
}

export class ImprovePostDto {
  @ApiProperty({
    example: 'This is my post content...',
    description: 'Original post content to improve',
  })
  @IsString()
  content!: string;

  @ApiProperty({
    example: 'Make it more punchy',
    description: 'Specific instructions for improvement',
    required: false,
  })
  @IsOptional()
  @IsString()
  improvements?: string;
}
