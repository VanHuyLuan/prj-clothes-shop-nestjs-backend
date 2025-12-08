import { IsString, IsOptional, IsArray, IsDecimal, IsInt, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductVariantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty()
  @IsString()
  sku: string;

  @ApiProperty()
  @IsDecimal()
  price: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDecimal()
  sale_price?: number;

  @ApiProperty({ default: 0 })
  @IsInt()
  stock_qty: number;
}

export class CreateProductImageDto {
  @ApiProperty()
  @IsString()
  url: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alt_text?: string;

  @ApiProperty({ default: 0 })
  @IsInt()
  sort: number;
}

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({ default: 'active' })
  @IsString()
  status: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID(4, { each: true })
  categoryIds: string[];

  @ApiProperty({ type: [CreateProductVariantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants: CreateProductVariantDto[];

  @ApiPropertyOptional({ type: [CreateProductImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductImageDto)
  images?: CreateProductImageDto[];
}
