import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InventoryQueryDto } from './dto/inventory-query.dto';

const LOW_STOCK_THRESHOLD = 10;

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getInventory(query: InventoryQueryDto) {
    const { page = 1, limit = 20, search, status } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { sku: { contains: search, mode: 'insensitive' } },
        { product: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status === 'out_of_stock') {
      where.stock_qty = 0;
    } else if (status === 'low_stock') {
      where.stock_qty = { gt: 0, lte: LOW_STOCK_THRESHOLD };
    } else if (status === 'in_stock') {
      where.stock_qty = { gt: LOW_STOCK_THRESHOLD };
    }

    const [variants, total, lowStockCount, outOfStockCount] = await Promise.all([
      this.prisma.productVariant.findMany({
        where,
        include: {
          product: {
            include: {
              images: { take: 1, orderBy: { sort: 'asc' } },
              categories: { take: 1 },
            },
          },
        },
        orderBy: { stock_qty: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.productVariant.count({ where }),
      this.prisma.productVariant.count({
        where: { stock_qty: { gt: 0, lte: LOW_STOCK_THRESHOLD } },
      }),
      this.prisma.productVariant.count({
        where: { stock_qty: 0 },
      }),
    ]);

    return {
      data: variants,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      lowStockCount,
      outOfStockCount,
    };
  }

  async updateStock(variantId: string, stock_qty: number) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      throw new NotFoundException(`Variant ${variantId} not found`);
    }

    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: { stock_qty },
      include: {
        product: {
          include: {
            images: { take: 1, orderBy: { sort: 'asc' } },
            categories: { take: 1 },
          },
        },
      },
    });
  }
}
