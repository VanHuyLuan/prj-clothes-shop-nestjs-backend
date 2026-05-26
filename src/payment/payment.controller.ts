import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Response } from 'express';
import { PaymentService } from './payment.service';
import { CreateMomoPaymentDto } from './dto/create-momo-payment.dto';
import { MomoCallbackDto } from './dto/momo-callback.dto';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('momo/create')
  @ApiOperation({ 
    summary: 'Create MoMo payment',
    description: 'Create a new payment request with MoMo and get payment URL'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Payment request created successfully',
    schema: {
      example: {
        success: true,
        message: 'Successful.',
        payUrl: 'https://test-payment.momo.vn/...',
        qrCodeUrl: 'momo://app?action=payWithApp&isScanQR=true...',
        deeplink: 'momo://app?action=payWithApp...',
        orderId: 'order-123456',
        requestId: 'MOMO1234567890',
        resultCode: 0
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async createMomoPayment(@Body() createPaymentDto: CreateMomoPaymentDto) {
    return await this.paymentService.createPayment(createPaymentDto);
  }

  @Get('momo/qr/:orderId')
  @ApiOperation({ 
    summary: 'Display MoMo QR code',
    description: 'Show QR code page for MoMo payment. Auto-creates payment if not exists with default amount.'
  })
  @ApiParam({ 
    name: 'orderId', 
    description: 'Order ID',
    example: 'order-123456'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'QR code page displayed',
    content: {
      'text/html': {
        schema: {
          type: 'string'
        }
      }
    }
  })
  async showQRCode(
    @Param('orderId') orderId: string,
    @Res() res: Response
  ) {
    let payment = await this.paymentService.getPaymentByOrderId(orderId);
    
    // If payment doesn't exist, create a new one with default amount
    if (!payment) {
      try {
        // Try to get order amount, otherwise use default
        const order = await this.paymentService['prisma'].order.findUnique({
          where: { order_number: orderId }
        });
        
        const amount = order ? Number(order.total_amount) : 50000;
        
        // Create payment
        await this.paymentService.createPayment({
          orderId,
          amount,
          orderInfo: `Thanh toán đơn hàng ${orderId}`,
          extraData: ''
        });
        
        // Get the newly created payment
        payment = await this.paymentService.getPaymentByOrderId(orderId);
      } catch (error) {
        return res.status(500).send(`
          <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: Arial; padding: 40px; text-align: center; background: #f5f5f5; }
                .error { background: white; padding: 40px; border-radius: 10px; max-width: 500px; margin: 0 auto; }
                h1 { color: #dc3545; }
                p { color: #666; margin: 20px 0; }
                a { color: #007bff; text-decoration: none; }
              </style>
            </head>
            <body>
              <div class="error">
                <h1>❌ Lỗi tạo thanh toán</h1>
                <p>Không thể tạo thanh toán tự động. Vui lòng tạo thanh toán thủ công:</p>
                <pre style="text-align: left; background: #f8f9fa; padding: 15px; border-radius: 5px;">
POST /payment/momo/create
{
  "orderId": "${orderId}",
  "amount": 50000,
  "orderInfo": "Test payment"
}
                </pre>
                <p><a href="/api">← Quay lại API Documentation</a></p>
              </div>
            </body>
          </html>
        `);
      }
    }
    
    if (!payment) {
      return res.status(404).send(`
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial; padding: 40px; text-align: center; background: #f5f5f5; }
              .error { background: white; padding: 40px; border-radius: 10px; max-width: 500px; margin: 0 auto; }
              h1 { color: #dc3545; }
            </style>
          </head>
          <body>
            <div class="error">
              <h1>❌ Không tìm thấy thanh toán</h1>
            </div>
          </body>
        </html>
      `);
    }

    // Get latest payment info from MoMo
    const paymentInfo = await this.paymentService.queryTransaction(orderId);
    
    const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thanh toán MoMo - ${orderId}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 500px;
            width: 100%;
            padding: 40px;
            text-align: center;
        }
        .logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 20px;
            background: linear-gradient(135deg, #a21484 0%, #d41872 100%);
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            color: white;
        }
        h1 {
            color: #333;
            font-size: 24px;
            margin-bottom: 10px;
        }
        .amount {
            color: #a21484;
            font-size: 36px;
            font-weight: bold;
            margin: 20px 0;
        }
        .order-id {
            color: #666;
            font-size: 14px;
            margin-bottom: 30px;
        }
        .qr-section {
            background: #f8f9fa;
            border-radius: 15px;
            padding: 30px;
            margin: 30px 0;
        }
        .qr-link {
            font-family: monospace;
            font-size: 12px;
            color: #666;
            word-break: break-all;
            margin: 20px 0;
            padding: 15px;
            background: white;
            border-radius: 10px;
            border: 2px dashed #ddd;
        }
        .instructions {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            text-align: left;
            border-radius: 5px;
        }
        .instructions h3 {
            color: #856404;
            font-size: 16px;
            margin-bottom: 10px;
        }
        .instructions ol {
            color: #856404;
            padding-left: 20px;
            font-size: 14px;
        }
        .instructions li {
            margin: 8px 0;
        }
        .btn {
            display: inline-block;
            background: linear-gradient(135deg, #a21484 0%, #d41872 100%);
            color: white;
            padding: 15px 40px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
            margin: 10px;
            transition: transform 0.2s, box-shadow 0.2s;
            border: none;
            cursor: pointer;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(162, 20, 132, 0.3);
        }
        .btn-secondary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .status {
            display: inline-block;
            padding: 8px 20px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            margin: 10px 0;
        }
        .status-pending {
            background: #fff3cd;
            color: #856404;
        }
        .status-completed {
            background: #d4edda;
            color: #155724;
        }
        .status-failed {
            background: #f8d7da;
            color: #721c24;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 20px 0;
            text-align: left;
        }
        .info-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 10px;
        }
        .info-label {
            color: #666;
            font-size: 12px;
            margin-bottom: 5px;
        }
        .info-value {
            color: #333;
            font-size: 14px;
            font-weight: 600;
        }
        @media (max-width: 600px) {
            .container {
                padding: 30px 20px;
            }
            .amount {
                font-size: 28px;
            }
            .info-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">💳</div>
        <h1>Thanh toán MoMo</h1>
        <div class="amount">${Number(payment.amount).toLocaleString('vi-VN')} ₫</div>
        <div class="order-id">Mã đơn hàng: <strong>${orderId}</strong></div>
        
        <div class="status status-${payment.status}">
            ${payment.status === 'pending' ? '⏳ Chờ thanh toán' : 
              payment.status === 'completed' ? '✅ Đã thanh toán' : 
              '❌ Thanh toán thất bại'}
        </div>

        <div class="qr-section">
            <h3>📱 Quét mã QR để thanh toán</h3>
            <div class="qr-link">
                ${paymentInfo.qrCodeUrl || 'Đang tải...'}
            </div>
        </div>

        <div class="instructions">
            <h3>📋 Hướng dẫn thanh toán:</h3>
            <ol>
                <li>Mở ứng dụng MoMo trên điện thoại</li>
                <li>Chọn "Quét mã QR"</li>
                <li>Quét mã QR ở trên hoặc nhấn nút bên dưới</li>
                <li>Xác nhận thanh toán</li>
            </ol>
        </div>

        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Phương thức</div>
                <div class="info-value">MoMo Wallet</div>
            </div>
            <div class="info-item">
                <div class="info-label">Trạng thái</div>
                <div class="info-value">${payment.status === 'pending' ? 'Chờ thanh toán' : 
                  payment.status === 'completed' ? 'Đã thanh toán' : 'Thất bại'}</div>
            </div>
        </div>

        <a href="${paymentInfo.qrCodeUrl || '#'}" class="btn">🚀 Mở MoMo App</a>
        <a href="/payment/order/${orderId}" class="btn btn-secondary">🔍 Kiểm tra thanh toán</a>
    </div>

    <script>
        // Auto refresh every 5 seconds to check payment status
        setInterval(() => {
            fetch('/payment/order/${orderId}')
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'completed') {
                        window.location.reload();
                    }
                })
                .catch(err => console.error('Error checking status:', err));
        }, 5000);
    </script>
</body>
</html>
    `;
    
    return res.send(html);
  }

  @Post('momo/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'MoMo IPN callback',
    description: 'Handle payment notification from MoMo (IPN - Instant Payment Notification)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Callback processed successfully' 
  })
  @ApiResponse({ status: 400, description: 'Invalid signature or data' })
  async handleMomoCallback(@Body() callbackData: MomoCallbackDto) {
    return await this.paymentService.handleCallback(callbackData);
  }

  @Get('momo/query/:orderId')
  @ApiOperation({ 
    summary: 'Query payment transaction',
    description: 'Query payment status from MoMo by order ID'
  })
  @ApiParam({ 
    name: 'orderId', 
    description: 'Order ID to query',
    example: 'order-123456'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Transaction status retrieved',
    schema: {
      example: {
        partnerCode: 'MOMO',
        orderId: 'order-123456',
        requestId: 'MOMO1234567890',
        amount: 50000,
        resultCode: 0,
        message: 'Successful.',
        localPaymentData: {
          id: 'payment-id',
          status: 'completed'
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async queryTransaction(@Param('orderId') orderId: string) {
    return await this.paymentService.queryTransaction(orderId);
  }

  @Post('momo/simulate-success/:orderId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[DEV] Simulate MoMo payment success',
    description:
      'Manually marks a payment as completed and confirms the order. Use this when ipnUrl is localhost and MoMo cannot call back.',
  })
  @ApiParam({ name: 'orderId', description: 'Internal order number', example: 'ORD-12345' })
  async simulateMomoSuccess(@Param('orderId') orderId: string) {
    return await this.paymentService.simulateSuccess(orderId);
  }

  @Get('order/:orderId')
  @ApiOperation({
    summary: 'Get payment by order ID',
    description: 'Get payment information from local database by order ID',
  })
  @ApiParam({ 
    name: 'orderId', 
    description: 'Order ID',
    example: 'order-123456'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Payment information retrieved' 
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPaymentByOrderId(@Param('orderId') orderId: string) {
    return await this.paymentService.getPaymentByOrderId(orderId);
  }
}
