import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateMomoPaymentDto {
  @ApiProperty({ 
    description: 'Order ID from your system',
    example: 'order-123456'
  })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ 
    description: 'Payment amount in VND',
    example: 50000
  })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ 
    description: 'Order information',
    example: 'Payment for order #123456'
  })
  @IsString()
  @IsNotEmpty()
  orderInfo: string;

  @ApiProperty({ 
    description: 'Extra data (optional)',
    example: '',
    required: false
  })
  @IsString()
  @IsOptional()
  extraData?: string;
}
