import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateOrderDto, CreateOrderFromCartDto } from './dto/create-order.dto';
import { UpdateOrderDto, OrderStatus } from './dto/update-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    const { items, shipping_address, user_id } = createOrderDto;

    // Validate all variants exist and have enough stock
    const variantIds = items.map(item => item.product_variant_id);
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: true }
    });

    if (variants.length !== variantIds.length) {
      throw new BadRequestException('Some product variants not found');
    }

    // Check stock availability
    for (const item of items) {
      const variant = variants.find(v => v.id === item.product_variant_id);
      if (!variant) {
        throw new BadRequestException('Product variant not found');
      }
      if (variant.stock_qty < item.quantity) {
        throw new BadRequestException(`Sản phẩm "${variant.product.name}" không đủ tồn kho (còn ${variant.stock_qty})`);
      }
    }

    // Calculate total amount using variant prices (not client-provided prices)
    let totalAmount = 0;
    const orderItems = items.map(item => {
      const variant = variants.find(v => v.id === item.product_variant_id)!;
      const unitPrice = Number(variant.sale_price || variant.price);
      const totalPrice = unitPrice * item.quantity;
      totalAmount += totalPrice;

      return {
        product_variant_id: item.product_variant_id,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: totalPrice
      };
    });

    // Generate order number
    const orderNumber = await this.generateOrderNumber();

    try {
      // Create order and decrement stock atomically in a transaction
      const order = await this.prisma.$transaction(async (prisma) => {
        const newOrder = await prisma.order.create({
          data: {
            user_id,
            order_number: orderNumber,
            total_amount: totalAmount,
            shipping_address: shipping_address as any,
            items: {
              create: orderItems
            }
          },
          include: {
            items: {
              include: {
                variant: {
                  include: {
                    product: {
                      include: {
                        images: true
                      }
                    }
                  }
                }
              }
            },
            user: true
          }
        });

        // Decrement stock for each ordered variant
        for (const item of items) {
          await prisma.productVariant.update({
            where: { id: item.product_variant_id },
            data: {
              stock_qty: {
                decrement: item.quantity
              }
            }
          });
        }

        return newOrder;
      });

      // Send confirmation email for COD orders (non-blocking)
      if (!createOrderDto.payment_method || createOrderDto.payment_method === 'cod') {
        const u = order.user as any;
        if (u?.email) {
          this.mailService
            .sendOrderConfirmationEmail(u.email, u.firstName || u.username, order.order_number, order.total_amount, 'cod')
            .catch((err) => this.logger.error('Failed to send order email', err));
        }
      }

      return order;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to create order');
    }
  }

  async createFromCart(createOrderFromCartDto: CreateOrderFromCartDto, userId?: string) {
    const { cart_id, shipping_address } = createOrderFromCartDto;

    // Get cart items
    let cart;
    if (userId) {
      cart = await this.prisma.cart.findFirst({
        where: { user_id: userId },
        include: {
          items: {
            include: {
              variant: {
                include: { product: true }
              }
            }
          }
        }
      });
    } else if (cart_id) {
      cart = await this.prisma.cart.findUnique({
        where: { id: cart_id },
        include: {
          items: {
            include: {
              variant: {
                include: { product: true }
              }
            }
          }
        }
      });
    }

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Convert cart items to order items
    const orderItems = cart.items.map(item => ({
      product_variant_id: item.product_variant_id,
      quantity: item.quantity,
    }));

    const createOrderDto: CreateOrderDto = {
      user_id: userId,
      items: orderItems,
      shipping_address,
    };

    const order = await this.create(createOrderDto);

    // Clear cart after successful order creation
    await this.prisma.cartItem.deleteMany({
      where: { cart_id: cart.id }
    });

    return order;
  }

  async findAll(query: OrderQueryDto, userRole?: string, currentUserId?: string) {
    const { page = 1, limit = 10, search, status, userId, sortBy = 'created_at', sortOrder = 'desc' } = query;
    
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (search) {
      where.order_number = {
        contains: search,
        mode: 'insensitive'
      };
    }
    
    if (status) {
      where.status = status;
    }

    // If not admin, only show user's own orders
    if (userRole !== 'admin') {
      where.user_id = currentUserId;
    } else if (userId) {
      where.user_id = userId;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    include: {
                      images: true
                    }
                  }
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          [sortBy]: sortOrder
        },
        skip,
        take: limit
      }),
      this.prisma.order.count({ where })
    ]);

    return {
      data: orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, userRole?: string, currentUserId?: string) {
    const where: any = { id };

    // If not admin, only allow access to user's own orders
    if (userRole !== 'admin') {
      where.user_id = currentUserId;
    }

    const order = await this.prisma.order.findFirst({
      where,
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: true,
                    categories: true
                  }
                }
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async findByOrderNumber(orderNumber: string, userRole?: string, currentUserId?: string) {
    const where: any = { order_number: orderNumber };

    // If not admin, only allow access to user's own orders
    if (userRole !== 'admin') {
      where.user_id = currentUserId;
    }

    const order = await this.prisma.order.findFirst({
      where,
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: true,
                    categories: true
                  }
                }
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!order) {
      throw new NotFoundException(`Order with number ${orderNumber} not found`);
    }

    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto, userRole?: string, currentUserId?: string) {
    // Only admin can update orders, or user can cancel their own pending orders
    const order = await this.findOne(id, userRole, currentUserId);

    if (userRole !== 'admin') {
      // Users can only cancel their own pending orders
      if (updateOrderDto.status && updateOrderDto.status !== OrderStatus.CANCELLED) {
        throw new BadRequestException('Users can only cancel their orders');
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException('Can only cancel pending orders');
      }
    }

    try {
      const updatedOrder = await this.prisma.order.update({
        where: { id },
        data: updateOrderDto,
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    include: {
                      images: true
                    }
                  }
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      // If order is cancelled, restore stock
      if (updateOrderDto.status === OrderStatus.CANCELLED && order.status !== OrderStatus.CANCELLED) {
        await this.restoreStock(order.items);
      }

      return updatedOrder;
    } catch (error) {
      throw new BadRequestException('Failed to update order');
    }
  }

  async getUserOrders(userId: string, query: OrderQueryDto) {
    const { page = 1, limit = 10, status, sortBy = 'created_at', sortOrder = 'desc' } = query;
    
    const skip = (page - 1) * limit;
    
    const where: any = { user_id: userId };
    
    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    include: {
                      images: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          [sortBy]: sortOrder
        },
        skip,
        take: limit
      }),
      this.prisma.order.count({ where })
    ]);

    return {
      data: orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async generateOrderNumber(): Promise<string> {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${timestamp}-${random}`;
  }

  private async restoreStock(orderItems: any[]) {
    for (const item of orderItems) {
      await this.prisma.productVariant.update({
        where: { id: item.product_variant_id },
        data: {
          stock_qty: {
            increment: item.quantity
          }
        }
      });
    }
  }
}