import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PaymentProvider {
  STRIPE = 'stripe',
  PAYTECH = 'paytech',
}

export class CreateCheckoutSessionDto {
  @ApiProperty({
    example: 'PREMIUM',
    description: 'The subscription plan name',
  })
  @IsString()
  @IsNotEmpty()
  plan!: string;

  @ApiProperty({
    example: PaymentProvider.STRIPE,
    description: 'The payment provider to use',
    enum: PaymentProvider,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider;
}
