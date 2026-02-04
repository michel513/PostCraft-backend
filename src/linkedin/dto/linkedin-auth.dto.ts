import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LinkedInCallbackDto {
  @ApiProperty({
    description: 'The authorization code returned by LinkedIn',
    example: 'AQA_...some_code...',
  })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({
    description: 'The state parameter (usually containing the user ID)',
    example: 'user-uuid-1234',
  })
  @IsString()
  @IsNotEmpty()
  state!: string;
}
