import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(userId?: string, cartId?: string) {
    let cart;

    if (userId) {
      // For logged in users
      cart = await this.prisma.cart.findFirst({
        where: { user_id: userId },
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
        }
      });

      // Create cart if doesn't exist
      if (!cart) {
        cart = await this.prisma.cart.create({
          data: { user_id: userId },
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
          }
        });
      }
    } else if (cartId) {
      // For guest users
      cart = await this.prisma.cart.findUnique({
        where: { id: cartId },
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
        }
      });

      if (!cart) {
        throw new NotFoundException('Cart not found');
      }
    } else {
      // Create guest cart
      cart = await this.prisma.cart.create({
        data: {},
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
        }
      });
    }

    // Calculate totals
    const totals = this.calculateCartTotals(cart);

    return {
      ...cart,
      ...totals
    };
  }

  async addToCart(addToCartDto: AddToCartDto, userId?: string, cartId?: string) {
    const { productVariantId, quantity } = addToCartDto;

    // Check if product variant exists and has enough stock
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: productVariantId },
      include: {
        product: true
      }
    });

    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }

    if (variant.stock_qty < quantity) {
      throw new BadRequestException(`Not enough stock. Available: ${variant.stock_qty}`);
    }

    // Get or create cart
    let cart = await this.getCartRecord(userId, cartId);

    // Check if item already exists in cart
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cart_id_product_variant_id: {
          cart_id: cart.id,
          product_variant_id: productVariantId
        }
      }
    });

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;
      
      if (variant.stock_qty < newQuantity) {
        throw new BadRequestException(`Not enough stock. Available: ${variant.stock_qty}, Current in cart: ${existingItem.quantity}`);
      }

      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity }
      });
    } else {
      // Create new cart item
      await this.prisma.cartItem.create({
        data: {
          cart_id: cart.id,
          product_variant_id: productVariantId,
          quantity
        }
      });
    }

    return this.getCart(userId, cart.id);
  }

  async updateCartItem(cartItemId: string, updateCartItemDto: UpdateCartItemDto, userId?: string, cartId?: string) {
    const { quantity } = updateCartItemDto;

    // Find cart item
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: {
        cart: true,
        variant: true
      }
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    // Verify ownership
    if (userId && cartItem.cart.user_id !== userId) {
      throw new BadRequestException('Unauthorized access to cart');
    }

    if (cartId && cartItem.cart.id !== cartId) {
      throw new BadRequestException('Cart item not found in specified cart');
    }

    // Check stock
    if (cartItem.variant.stock_qty < quantity) {
      throw new BadRequestException(`Not enough stock. Available: ${cartItem.variant.stock_qty}`);
    }

    await this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity }
    });

    return this.getCart(userId, cartItem.cart.id);
  }

  async removeCartItem(cartItemId: string, userId?: string, cartId?: string) {
    // Find cart item
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: {
        cart: true
      }
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    // Verify ownership
    if (userId && cartItem.cart.user_id !== userId) {
      throw new BadRequestException('Unauthorized access to cart');
    }

    if (cartId && cartItem.cart.id !== cartId) {
      throw new BadRequestException('Cart item not found in specified cart');
    }

    await this.prisma.cartItem.delete({
      where: { id: cartItemId }
    });

    return this.getCart(userId, cartItem.cart.id);
  }

  async clearCart(userId?: string, cartId?: string) {
    const cart = await this.getCartRecord(userId, cartId);

    await this.prisma.cartItem.deleteMany({
      where: { cart_id: cart.id }
    });

    return this.getCart(userId, cart.id);
  }

  async mergeGuestCart(guestCartId: string, userId: string) {
    const guestCart = await this.prisma.cart.findUnique({
      where: { id: guestCartId },
      include: { items: true }
    });

    if (!guestCart) {
      return this.getCart(userId);
    }

    const userCart = await this.getCartRecord(userId);

    // Move items from guest cart to user cart
    for (const item of guestCart.items) {
      const existingItem = await this.prisma.cartItem.findUnique({
        where: {
          cart_id_product_variant_id: {
            cart_id: userCart.id,
            product_variant_id: item.product_variant_id
          }
        }
      });

      if (existingItem) {
        // Update quantity
        await this.prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + item.quantity }
        });
      } else {
        // Create new item in user cart
        await this.prisma.cartItem.create({
          data: {
            cart_id: userCart.id,
            product_variant_id: item.product_variant_id,
            quantity: item.quantity
          }
        });
      }
    }

    // Delete guest cart
    await this.prisma.cart.delete({
      where: { id: guestCartId }
    });

    return this.getCart(userId);
  }

  private async getCartRecord(userId?: string, cartId?: string) {
    let cart;

    if (userId) {
      cart = await this.prisma.cart.findFirst({
        where: { user_id: userId }
      });

      if (!cart) {
        cart = await this.prisma.cart.create({
          data: { user_id: userId }
        });
      }
    } else if (cartId) {
      cart = await this.prisma.cart.findUnique({
        where: { id: cartId }
      });

      if (!cart) {
        throw new NotFoundException('Cart not found');
      }
    } else {
      cart = await this.prisma.cart.create({
        data: {}
      });
    }

    return cart;
  }

  private calculateCartTotals(cart: any) {
    let subtotal = 0;
    let totalQuantity = 0;

    for (const item of cart.items) {
      const price = item.variant.sale_price || item.variant.price;
      subtotal += price * item.quantity;
      totalQuantity += item.quantity;
    }

    return {
      subtotal,
      totalQuantity,
      itemCount: cart.items.length
    };
  }
}