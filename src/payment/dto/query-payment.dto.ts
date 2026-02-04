import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class QueryPaymentDto {
  @ApiProperty({ 
    description: 'Order ID to query',
    example: 'order-123456'
  })
  @IsString()
  @IsNotEmpty()
  orderId: string;
}
