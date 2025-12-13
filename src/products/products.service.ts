import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    const { categoryIds, variants, images, ...productData } = createProductDto;

    try {
      const product = await this.prisma.product.create({
        data: {
          ...productData,
          categories: {
            connect: categoryIds.map(id => ({ id }))
          },
          variants: {
            create: variants
          },
          images: images ? {
            create: images
          } : undefined
        },
        include: {
          categories: true,
          variants: true,
          images: true
        }
      });

      return product;
    } catch (error) {
      console.error('Error creating product:', error);
      
      // Trả về lỗi chi tiết để FE biết vấn đề cụ thể
      if (error.code === 'P2002') {
        throw new BadRequestException(`Duplicate value: ${error.meta?.target || 'unique constraint violated'}`);
      }
      if (error.code === 'P2003') {
        throw new BadRequestException('Invalid category ID or foreign key constraint failed');
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Related record not found');
      }
      
      throw new BadRequestException(error.message || 'Failed to create product');
    }
  }

  async findAll(query: ProductQueryDto) {
    const { page = 1, limit = 10, search, categoryId, brand, status, sortBy = 'created_at', sortOrder = 'desc' } = query;
    
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (categoryId) {
      where.categories = {
        some: { id: categoryId }
      };
    }
    
    if (brand) {
      where.brand = brand;
    }
    
    if (status) {
      where.status = status;
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          categories: true,
          variants: true,
          images: true
        },
        orderBy: {
          [sortBy]: sortOrder
        },
        skip,
        take: limit
      }),
      this.prisma.product.count({ where })
    ]);

    return {
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        categories: true,
        variants: true,
        images: true
      }
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        categories: true,
        variants: true,
        images: true
      }
    });

    if (!product) {
      throw new NotFoundException(`Product with slug ${slug} not found`);
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const { categoryIds, variants, images, ...productData } = updateProductDto;

    try {
      // Check if product exists
      await this.findOne(id);

      const product = await this.prisma.product.update({
        where: { id },
        data: {
          ...productData,
          ...(categoryIds && {
            categories: {
              set: categoryIds.map(categoryId => ({ id: categoryId }))
            }
          }),
          ...(variants && {
            variants: {
              deleteMany: {},
              create: variants
            }
          }),
          ...(images && {
            images: {
              deleteMany: {},
              create: images
            }
          })
        },
        include: {
          categories: true,
          variants: true,
          images: true
        }
      });

      return product;
    } catch (error) {
      throw new BadRequestException('Failed to update product');
    }
  }

  async remove(id: string) {
    try {
      await this.findOne(id);

      await this.prisma.product.delete({
        where: { id }
      });

      return { message: 'Product deleted successfully' };
    } catch (error) {
      throw new BadRequestException('Failed to delete product');
    }
  }

  async getProductVariants(productId: string) {
    const product = await this.findOne(productId);
    return product.variants;
  }

  async updateVariant(productId: string, variantId: string, data: any) {
    await this.findOne(productId);

    const variant = await this.prisma.productVariant.update({
      where: { id: variantId },
      data
    });

    return variant;
  }

  async updateStock(variantId: string, quantity: number) {
    const variant = await this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        stock_qty: {
          increment: quantity
        }
      }
    });

    return variant;
  }
}