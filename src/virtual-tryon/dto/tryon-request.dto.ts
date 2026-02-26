import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, IsIn, Min, Max } from 'class-validator';

export class VirtualTryonDto {
  @ApiProperty({
    description: 'URL hoặc path của ảnh người',
    example: 'https://example.com/person.jpg'
  })
  @IsString()
  personImage: string;

  @ApiProperty({
    description: 'URL hoặc path của ảnh quần áo',
    example: 'https://example.com/garment.jpg'
  })
  @IsString()
  garmentImage: string;

  @ApiProperty({
    description: 'Loại quần áo',
    enum: ['Upper-body', 'Lower-body', 'Dress'],
    example: 'Upper-body'
  })
  @IsIn(['Upper-body', 'Lower-body', 'Dress'])
  category: string;

  @ApiProperty({
    description: 'Số bước denoise (10-40)',
    example: 20,
    minimum: 10,
    maximum: 40
  })
  @IsNumber()
  @Min(10)
  @Max(40)
  @IsOptional()
  denoiseSteps?: number = 20;

  @ApiProperty({
    description: 'Seed cho reproducibility (-1 = random)',
    example: -1
  })
  @IsNumber()
  @IsOptional()
  seed?: number = -1;

  @ApiProperty({
    description: 'Sử dụng cache cục bộ',
    example: true
  })
  @IsBoolean()
  @IsOptional()
  useCache?: boolean = true;
}

export class TryonResponseDto {
  @ApiProperty({
    description: 'URL của ảnh kết quả'
  })
  outputImage: string;

  @ApiProperty({
    description: 'Thông báo trạng thái'
  })
  message: string;

  @ApiProperty({
    description: 'Thành công hay không'
  })
  success: boolean;

  @ApiProperty({
    description: 'Request ID để tracking'
  })
  requestId?: string;

  @ApiProperty({
    description: 'Thời gian xử lý (ms)'
  })
  processingTime?: number;
}
