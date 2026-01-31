import {
  Controller,
  Post,
  Body,
  Headers,
  UseGuards,
  Request,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { PaymentsService, PayTechIPNData } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CreateCheckoutSessionDto,
  PaymentProvider,
} from './dto/create-checkout-session.dto';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('create-checkout-session')
  @ApiOperation({ summary: 'Create a checkout session for payment' })
  @ApiResponse({
    status: 201,
    description: 'Checkout session created successfully',
  })
  createCheckoutSession(
    @Request() req: any,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    const userRequest = req as unknown as RequestWithUser;

    if (dto.provider === PaymentProvider.PAYTECH) {
      return this.paymentsService.createPayTechPayment(userRequest.user.userId);
    }

    return this.paymentsService.createStripeCheckoutSession(
      userRequest.user.userId,
      dto.plan,
    );
  }

  @Post('webhook/stripe')
  @ApiOperation({ summary: 'Stripe Webhook endpoint' })
  @ApiHeader({
    name: 'stripe-signature',
    description: 'Stripe webhook signature',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const payload = req.rawBody;
    if (!payload) {
      throw new Error('No payload received');
    }
    return this.paymentsService.handleStripeWebhook(signature, payload);
  }

  @Post('paytech/ipn')
  @ApiOperation({ summary: 'PayTech IPN (Webhook) endpoint' })
  @ApiResponse({ status: 200, description: 'IPN processed' })
  async handlePayTechIPN(@Body() data: PayTechIPNData) {
    return this.paymentsService.handlePayTechIPN(data);
  }
}
