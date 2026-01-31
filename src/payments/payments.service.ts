import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionPlan } from '@prisma/client';
import axios from 'axios';

export interface PayTechIPNData {
  custom_field?: string;
  ref_command?: string;
  type_event?: string;
}

interface StripeSubscription {
  id: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
}

@Injectable()
export class PaymentsService {
  private stripe: Stripe;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey, {
        apiVersion: '2026-01-28.clover',
      });
    }
  }

  // --- STRIPE METHODS ---

  async createStripeCheckoutSession(userId: string, plan: string) {
    if (plan !== 'PREMIUM') {
      throw new Error('Invalid subscription plan');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;

      await this.prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Premium Subscription',
              description: 'Unlimited AI-generated LinkedIn posts (Stripe)',
            },
            unit_amount: 2999, // $29.99
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${this.configService.get('FRONTEND_URL')}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.configService.get('FRONTEND_URL')}/payment/cancel`,
      metadata: { userId: user.id, plan },
    });

    return { url: session.url, sessionId: session.id };
  }

  async handleStripeWebhook(signature: string, payload: Buffer) {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Stripe webhook signature verification failed: ${message}`,
      );
      throw new Error(`Webhook signature verification failed: ${message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleStripeCheckoutSessionCompleted(event.data.object);
        break;
      case 'customer.subscription.updated':
        await this.handleStripeSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleStripeSubscriptionDeleted(event.data.object);
        break;
    }

    return { received: true };
  }

  private async handleStripeCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ) {
    const userId = session.metadata?.userId;
    const subscriptionId = session.subscription as string;
    if (!userId || !subscriptionId) return;

    const subResponse =
      await this.stripe.subscriptions.retrieve(subscriptionId);
    const subscription = subResponse as unknown as StripeSubscription;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: SubscriptionPlan.PREMIUM,
        subscriptionId: subscriptionId,
        subscription: {
          upsert: {
            create: {
              stripeId: subscriptionId,
              status: SubscriptionPlan.PREMIUM,
              currentPeriodStart: new Date(
                subscription.current_period_start * 1000,
              ),
              currentPeriodEnd: new Date(
                subscription.current_period_end * 1000,
              ),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            },
            update: {
              status: SubscriptionPlan.PREMIUM,
              currentPeriodStart: new Date(
                subscription.current_period_start * 1000,
              ),
              currentPeriodEnd: new Date(
                subscription.current_period_end * 1000,
              ),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            },
          },
        },
      },
    });
  }

  private async handleStripeSubscriptionUpdated(
    subscriptionData: Stripe.Subscription,
  ) {
    const subscription = subscriptionData as unknown as StripeSubscription;
    const user = await this.prisma.user.findFirst({
      where: { subscriptionId: subscription.id },
    });
    if (!user) return;

    const status =
      subscription.status === 'active'
        ? SubscriptionPlan.PREMIUM
        : SubscriptionPlan.FREE;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: status,
        subscription: {
          update: {
            status: status,
            currentPeriodStart: new Date(
              subscription.current_period_start * 1000,
            ),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          },
        },
      },
    });
  }

  private async handleStripeSubscriptionDeleted(
    subscription: Stripe.Subscription,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { subscriptionId: subscription.id },
    });
    if (!user) return;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: SubscriptionPlan.FREE,
        subscriptionId: null,
        subscription: {
          delete: true,
        },
      },
    });
  }

  // --- PAYTECH METHODS ---

  async createPayTechPayment(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const paytechApiKey = this.configService.get<string>('PAYTECH_API_KEY');
    const paytechApiSecret =
      this.configService.get<string>('PAYTECH_API_SECRET');
    const paytechEnv = this.configService.get<string>('PAYTECH_ENV') || 'test';

    const params = {
      item_name: 'Premium Subscription (PayTech)',
      item_price: 15000, // example price in XOF
      currency: 'XOF',
      ref_command: `CMD_${userId}_${Date.now()}`,
      command_name: 'Premium Subscription for LinkedIn SaaS',
      env: paytechEnv,
      ipn_url: `${this.configService.get('BACKEND_URL')}/payments/paytech/ipn`,
      success_url: `${this.configService.get('FRONTEND_URL')}/payment/success`,
      cancel_url: `${this.configService.get('FRONTEND_URL')}/payment/cancel`,
      custom_field: JSON.stringify({
        userId: user.id,
        email: user.email,
      }),
    };

    try {
      const response = await axios.post<{
        success: number;
        redirect_url: string;
        token: string;
        message?: string;
      }>('https://paytech.sn/api/payment/request-payment', params, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          API_KEY: paytechApiKey,
          API_SECRET: paytechApiSecret,
        },
      });

      if (response.data.success === 1) {
        return {
          url: response.data.redirect_url,
          token: response.data.token,
        };
      } else {
        throw new Error(response.data.message || 'PayTech request failed');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`PayTech payment request failed: ${message}`);
      throw new Error(`PayTech payment request failed: ${message}`);
    }
  }

  async handlePayTechIPN(data: PayTechIPNData) {
    try {
      const customFieldData = data.custom_field
        ? (JSON.parse(data.custom_field) as { userId: string; email: string })
        : null;
      const userId = customFieldData?.userId;
      const refCommand = data.ref_command;
      const typeEvent = data.type_event; // usually 'sale' for success

      if (userId && typeEvent === 'sale') {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionStatus: SubscriptionPlan.PREMIUM,
          },
        });

        this.logger.log(
          `PayTech payment successful for user ${userId}, ref: ${refCommand}`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error processing PayTech IPN: ${message}`);
    }

    return { success: true };
  }
}
