import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
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
      
      // Generate unique requestId
      const requestId = `${this.partnerCode}${new Date().getTime()}`;
      const requestType = 'captureWallet';
      const lang = 'vi';

      // Create raw signature string
      const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${this.ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${this.partnerCode}&redirectUrl=${this.redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

      this.logger.debug('Raw Signature:', rawSignature);

      // Generate signature
      const signature = this.createSignature(rawSignature);

      this.logger.debug('Signature:', signature);

      // Request body to send to MoMo
      const requestBody = {
        partnerCode: this.partnerCode,
        accessKey: this.accessKey,
        requestId,
        amount: amount.toString(),
        orderId,
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

      // Save payment transaction to database
      // Only link to order if it exists
      const orderExists = orderId ? await this.prisma.order.findUnique({
        where: { order_number: orderId },
      }) : null;

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

      // If payment successful, update order status (if order exists)
      if (resultCode === 0 && orderId) {
        const order = await this.prisma.order.findUnique({
          where: { order_number: orderId },
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
          this.logger.log(`Order ${orderId} confirmed and payment completed`);
        } else {
          this.logger.warn(`Payment successful but order ${orderId} not found in database`);
        }
      } else {
        this.logger.warn(`Payment failed for order ${orderId}: ${message}`);
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
}
