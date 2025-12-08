import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryQueryDto } from './dto/category-query.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const { parentId, ...categoryData } = createCategoryDto;

    try {
      // Check if slug already exists
      const existingCategory = await this.prisma.category.findUnique({
        where: { slug: categoryData.slug }
      });

      if (existingCategory) {
        throw new ConflictException('Category with this slug already exists');
      }

      // If parentId is provided, check if parent exists
      if (parentId) {
        const parent = await this.prisma.category.findUnique({
          where: { id: parentId }
        });

        if (!parent) {
          throw new NotFoundException('Parent category not found');
        }
      }

      const category = await this.prisma.category.create({
        data: {
          ...categoryData,
          ...(parentId && { parentId })
        },
        include: {
          parent: true,
          children: true,
          _count: {
            select: { products: true }
          }
        }
      });

      return category;
    } catch (error) {
      if (error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to create category');
    }
  }

  async findAll(query: CategoryQueryDto) {
    const { search, parentId, includeProducts = false, onlyParents = false } = query;
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (parentId) {
      where.parentId = parentId;
    }

    if (onlyParents) {
      where.parentId = null;
    }

    const include: any = {
      parent: true,
      children: true,
      _count: {
        select: { products: true }
      }
    };

    if (includeProducts) {
      include.products = {
        include: {
          variants: true,
          images: true
        }
      };
    }

    const categories = await this.prisma.category.findMany({
      where,
      include,
      orderBy: {
        created_at: 'desc'
      }
    });

    return categories;
  }

  async findOne(id: string, includeProducts = false) {
    const include: any = {
      parent: true,
      children: true,
      _count: {
        select: { products: true }
      }
    };

    if (includeProducts) {
      include.products = {
        include: {
          variants: true,
          images: true
        }
      };
    }

    const category = await this.prisma.category.findUnique({
      where: { id },
      include
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async findBySlug(slug: string, includeProducts = false) {
    const include: any = {
      parent: true,
      children: true,
      _count: {
        select: { products: true }
      }
    };

    if (includeProducts) {
      include.products = {
        include: {
          variants: true,
          images: true
        }
      };
    }

    const category = await this.prisma.category.findUnique({
      where: { slug },
      include
    });

    if (!category) {
      throw new NotFoundException(`Category with slug ${slug} not found`);
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    try {
      // Check if category exists
      await this.findOne(id);

      // If slug is being updated, check for conflicts
      if (updateCategoryDto.slug) {
        const existingCategory = await this.prisma.category.findFirst({
          where: {
            slug: updateCategoryDto.slug,
            NOT: { id }
          }
        });

        if (existingCategory) {
          throw new ConflictException('Category with this slug already exists');
        }
      }

      // If parentId is being updated, check if parent exists and prevent circular reference
      if (updateCategoryDto.parentId) {
        const parent = await this.prisma.category.findUnique({
          where: { id: updateCategoryDto.parentId }
        });

        if (!parent) {
          throw new NotFoundException('Parent category not found');
        }

        // Prevent setting self as parent or circular reference
        if (updateCategoryDto.parentId === id) {
          throw new BadRequestException('Category cannot be its own parent');
        }
      }

      const category = await this.prisma.category.update({
        where: { id },
        data: updateCategoryDto,
        include: {
          parent: true,
          children: true,
          _count: {
            select: { products: true }
          }
        }
      });

      return category;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update category');
    }
  }

  async remove(id: string) {
    try {
      const category = await this.prisma.category.findUnique({
        where: { id },
        include: {
          children: true,
          _count: {
            select: { products: true }
          }
        }
      });

      if (!category) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }

      // Check if category has children
      if (category.children.length > 0) {
        throw new BadRequestException('Cannot delete category with subcategories');
      }

      // Check if category has products
      if (category._count.products > 0) {
        throw new BadRequestException('Cannot delete category with products');
      }

      await this.prisma.category.delete({
        where: { id }
      });

      return { message: 'Category deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete category');
    }
  }

  async getTree() {
    const categories = await this.prisma.category.findMany({
      include: {
        children: {
          include: {
            children: true,
            _count: {
              select: { products: true }
            }
          }
        },
        _count: {
          select: { products: true }
        }
      },
      where: {
        parentId: null
      },
      orderBy: {
        name: 'asc'
      }
    });

    return categories;
  }

  async getProductsByCategory(categoryId: string, includeSubcategories = false) {
    const category = await this.findOne(categoryId);

    let categoryIds = [categoryId];

    if (includeSubcategories) {
      const subcategories = await this.getSubcategoryIds(categoryId);
      categoryIds = [...categoryIds, ...subcategories];
    }

    const products = await this.prisma.product.findMany({
      where: {
        categories: {
          some: {
            id: {
              in: categoryIds
            }
          }
        }
      },
      include: {
        variants: true,
        images: true,
        categories: true
      }
    });

    return products;
  }

  private async getSubcategoryIds(parentId: string): Promise<string[]> {
    const children = await this.prisma.category.findMany({
      where: { parentId },
      select: { id: true }
    });

    let allIds = children.map(child => child.id);

    for (const child of children) {
      const grandchildren = await this.getSubcategoryIds(child.id);
      allIds = [...allIds, ...grandchildren];
    }

    return allIds;
  }
}