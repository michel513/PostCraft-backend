import { IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({
    example: 'My first LinkedIn post!',
    description: 'The content of the post',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(3000)
  content!: string;

  @ApiProperty({
    example: 'urn:li:share:12345',
    description: 'LinkedIn post internal ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  linkedinId?: string;

  @ApiProperty({
    example: '2026-02-01T10:00:00Z',
    description: 'Scheduled date/time for publication',
    required: false,
  })
  @IsOptional()
  @IsString()
  scheduledAt?: string;
}
