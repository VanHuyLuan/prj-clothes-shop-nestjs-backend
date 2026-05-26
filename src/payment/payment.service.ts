import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateMomoPaymentDto } from './dto/create-momo-payment.dto';
import { MomoCallbackDto } from './dto/momo-callback.dto';
import * as crypto from 'crypto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly partnerCode: string;
  private readonly accessKey: string;
  private readonly secretKey: string;
  private readonly endpoint: string;
  private readonly redirectUrl: string;
  private readonly ipnUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {
    // MoMo credentials - should be stored in .env file
    this.partnerCode = this.configService.get<string>('MOMO_PARTNER_CODE') || 'MOMO';
    this.accessKey = this.configService.get<string>('MOMO_ACCESS_KEY') || 'F8BBA842ECF85';
    this.secretKey = this.configService.get<string>('MOMO_SECRET_KEY') || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
    this.endpoint = this.configService.get<string>('MOMO_ENDPOINT') || 'https://test-payment.momo.vn/v2/gateway/api/create';
    this.redirectUrl = this.configService.get<string>('MOMO_REDIRECT_URL') || 'http://localhost:3000/payment/success';
    this.ipnUrl = this.configService.get<string>('MOMO_IPN_URL') || 'http://localhost:4000/payment/momo/callback';
  }

  /**
   * Create HMAC SHA256 signature
   */
  private createSignature(rawSignature: string): string {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(rawSignature)
      .digest('hex');
  }

  /**
   * Create MoMo payment request
   */
  async createPayment(createPaymentDto: CreateMomoPaymentDto) {
    try {
      const { orderId, amount, orderInfo, extraData = '' } = createPaymentDto;
      
      // Check if order exists (optional - for validation)
      if (orderId) {
        const orderExists = await this.prisma.order.findUnique({
          where: { order_number: orderId },
        });
        
        if (!orderExists) {
          this.logger.warn(`Order ${orderId} not found in database. Payment will be created without order reference.`);
        }
      }
      
      // Generate unique requestId — also used as MoMo orderId to avoid duplicate-orderId errors
      const requestId = `${this.partnerCode}${new Date().getTime()}`;
      const momoOrderId = requestId; // MoMo requires a unique orderId per attempt
      const requestType = 'captureWallet';
      const lang = 'vi';

      // Create raw signature string (use momoOrderId, not our internal orderId)
      const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${this.ipnUrl}&orderId=${momoOrderId}&orderInfo=${orderInfo}&partnerCode=${this.partnerCode}&redirectUrl=${this.redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

      this.logger.debug('Raw Signature:', rawSignature);

      // Generate signature
      const signature = this.createSignature(rawSignature);

      this.logger.debug('Signature:', signature);

      // Request body to send to MoMo (use momoOrderId — unique per attempt)
      const requestBody = {
        partnerCode: this.partnerCode,
        accessKey: this.accessKey,
        requestId,
        amount: amount.toString(),
        orderId: momoOrderId,
        orderInfo,
        redirectUrl: this.redirectUrl,
        ipnUrl: this.ipnUrl,
        lang,
        extraData,
        requestType,
        signature,
      };

      this.logger.debug('Request Body:', JSON.stringify(requestBody));

      // Send request to MoMo
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      this.logger.debug('MoMo Response:', JSON.stringify(result));

      // Save payment — store our internal orderId so callback can locate the order
      const orderExists = orderId
        ? await this.prisma.order.findUnique({
            where: { order_number: orderId },
          })
        : null;

      await this.prisma.payment.create({
        data: {
          order_id: orderExists ? orderId : null,
          partner_code: this.partnerCode,
          request_id: requestId,
          amount,
          order_info: orderInfo,
          payment_method: 'momo',
          status: 'pending',
          extra_data: extraData,
        },
      });

      // Mark order as awaiting MoMo payment so FE can show retry button
      if (orderExists) {
        await this.prisma.order.update({
          where: { order_number: orderId },
          data: {
            payment_method: 'momo',
            payment_status: 'unpaid',
          },
        });
      }

      return {
        success: result.resultCode === 0,
        message: result.message,
        payUrl: result.payUrl,
        qrCodeUrl: result.qrCodeUrl,
        deeplink: result.deeplink,
        deeplinkMiniApp: result.deeplinkMiniApp,
        orderId,
        requestId,
        ...result,
      };
    } catch (error) {
      this.logger.error('Error creating MoMo payment:', error);
      throw new BadRequestException('Failed to create payment');
    }
  }

  /**
   * Handle MoMo IPN callback
   */
  async handleCallback(callbackData: MomoCallbackDto) {
    try {
      this.logger.log('Received MoMo callback:', JSON.stringify(callbackData));

      const {
        partnerCode,
        orderId,
        requestId,
        amount,
        orderInfo,
        orderType,
        transId,
        resultCode,
        message,
        payType,
        responseTime,
        extraData,
        signature,
      } = callbackData;

      // Verify signature
      const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
      
      const expectedSignature = this.createSignature(rawSignature);

      if (signature !== expectedSignature) {
        this.logger.error('Invalid signature');
        throw new BadRequestException('Invalid signature');
      }

      // Update payment status in database
      const payment = await this.prisma.payment.findFirst({
        where: {
          request_id: requestId,
        },
      });

      if (!payment) {
        this.logger.error(`Payment not found for requestId: ${requestId}`);
        throw new BadRequestException('Payment not found');
      }

      // Update payment status
      const status = resultCode === 0 ? 'completed' : 'failed';
      
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status,
          trans_id: transId,
          pay_type: payType,
          result_code: resultCode,
          result_message: message,
          response_time: new Date(responseTime),
        },
      });

      // Update order status — look up via payment.order_id (our internal order number)
      // MoMo's orderId is now the requestId (unique per attempt), not our order_number
      const internalOrderId = payment.order_id;
      if (internalOrderId) {
        const order = await this.prisma.order.findUnique({
          where: { order_number: internalOrderId },
          include: { user: true },
        });

        if (order) {
          if (resultCode === 0) {
            // Payment success → confirm order
            await this.prisma.order.update({
              where: { order_number: internalOrderId },
              data: {
                status: 'confirmed',
                payment_method: 'momo',
                payment_status: 'paid',
              },
            });
            this.logger.log(
              `Order ${internalOrderId} confirmed and payment completed`,
            );

            // Send confirmation email (non-blocking)
            if (order.user?.email) {
              const name = order.user.firstName || order.user.username;
              this.mailService
                .sendOrderConfirmationEmail(
                  order.user.email,
                  name,
                  internalOrderId,
                  Number(order.total_amount),
                  'momo',
                )
                .catch((err) => this.logger.error('Failed to send order email', err));
            }
          } else {
            // Payment failed → mark order payment as failed
            await this.prisma.order.update({
              where: { order_number: internalOrderId },
              data: { payment_status: 'failed' },
            });
            this.logger.warn(
              `Payment failed for order ${internalOrderId}: ${message}`,
            );
          }
        } else {
          this.logger.warn(`Order ${internalOrderId} not found in database`);
        }
      }

      return {
        success: true,
        message: 'Callback processed successfully',
      };
    } catch (error) {
      this.logger.error('Error handling callback:', error);
      throw error;
    }
  }

  /**
   * Query payment transaction status
   */
  async queryTransaction(orderId: string) {
    try {
      const payment = await this.prisma.payment.findFirst({
        where: { order_id: orderId },
        orderBy: { created_at: 'desc' },
      });

      if (!payment) {
        throw new BadRequestException('Payment not found');
      }

      const requestId = payment.request_id;
      const lang = 'vi';

      // Create signature for query
      const rawSignature = `accessKey=${this.accessKey}&orderId=${orderId}&partnerCode=${this.partnerCode}&requestId=${requestId}`;
      const signature = this.createSignature(rawSignature);

      const requestBody = {
        partnerCode: this.partnerCode,
        accessKey: this.accessKey,
        requestId,
        orderId,
        lang,
        signature,
      };

      // Query endpoint
      const queryEndpoint = 'https://test-payment.momo.vn/v2/gateway/api/query';

      const response = await fetch(queryEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      return {
        ...result,
        localPaymentData: payment,
      };
    } catch (error) {
      this.logger.error('Error querying transaction:', error);
      throw new BadRequestException('Failed to query transaction');
    }
  }

  /**
   * Get payment by order ID
   */
  async getPaymentByOrderId(orderId: string) {
    return await this.prisma.payment.findFirst({
      where: { order_id: orderId },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * DEV ONLY: Simulate a successful MoMo payment without real IPN.
   * Useful when ipnUrl is localhost and MoMo cannot call back.
   */
  async simulateSuccess(orderId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { order_id: orderId },
      orderBy: { created_at: 'desc' },
    });

    if (!payment) {
      throw new BadRequestException(
        `No pending payment found for order ${orderId}`,
      );
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'completed',
        result_code: 0,
        result_message: 'Simulated success',
      },
    });

    const order = await this.prisma.order.findUnique({
      where: { order_number: orderId },
      include: { user: true },
    });

    if (order) {
      await this.prisma.order.update({
        where: { order_number: orderId },
        data: {
          status: 'confirmed',
          payment_method: 'momo',
          payment_status: 'paid',
        },
      });

      if (order.user?.email) {
        const name = order.user.firstName || order.user.username;
        this.mailService
          .sendOrderConfirmationEmail(
            order.user.email,
            name,
            orderId,
            Number(order.total_amount),
            'momo',
          )
          .catch((err) => this.logger.error('Failed to send order email', err));
      }
    }

    return {
      success: true,
      message: `Payment for order ${orderId} marked as completed`,
    };
  }
}
