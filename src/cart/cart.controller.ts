import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Headers
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiHeader
} from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get cart contents' })
  @ApiHeader({ name: 'x-guest-cart-id', required: false, description: 'Guest cart ID for non-authenticated users' })
  @ApiResponse({ status: 200, description: 'Cart retrieved successfully' })
  getCart(
    @Request() req: any,
    @Headers('x-guest-cart-id') guestCartId?: string
  ) {
    const userId = req.user?.id;
    return this.cartService.getCart(userId, guestCartId);
  }

  @Get('guest/:cartId')
  @ApiOperation({ summary: 'Get guest cart contents' })
  @ApiParam({ name: 'cartId', description: 'Guest cart ID' })
  @ApiResponse({ status: 200, description: 'Guest cart retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Cart not found' })
  getGuestCart(@Param('cartId') cartId: string) {
    return this.cartService.getCart(undefined, cartId);
  }

  @Post('add')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiHeader({ name: 'x-guest-cart-id', required: false, description: 'Guest cart ID for non-authenticated users' })
  @ApiResponse({ status: 201, description: 'Item added to cart successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Not enough stock' })
  @ApiResponse({ status: 404, description: 'Product variant not found' })
  addToCart(
    @Body() addToCartDto: AddToCartDto,
    @Request() req: any,
    @Headers('x-guest-cart-id') guestCartId?: string
  ) {
    const userId = req.user?.id;
    console.log('🔍 [ADD TO CART] req.user:', req.user);
    console.log('🔍 [ADD TO CART] userId:', userId);
    console.log('🔍 [ADD TO CART] guestCartId:', guestCartId);
    return this.cartService.addToCart(addToCartDto, userId, guestCartId);
  }

  @Post('guest/add')
  @ApiOperation({ summary: 'Add item to guest cart' })
  @ApiHeader({ name: 'x-guest-cart-id', required: false, description: 'Guest cart ID' })
  @ApiResponse({ status: 201, description: 'Item added to guest cart successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Not enough stock' })
  @ApiResponse({ status: 404, description: 'Product variant not found' })
  addToGuestCart(
    @Body() addToCartDto: AddToCartDto,
    @Headers('x-guest-cart-id') guestCartId?: string
  ) {
    return this.cartService.addToCart(addToCartDto, undefined, guestCartId);
  }

  @Patch('items/:itemId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiParam({ name: 'itemId', description: 'Cart item ID' })
  @ApiHeader({ name: 'x-guest-cart-id', required: false, description: 'Guest cart ID for non-authenticated users' })
  @ApiResponse({ status: 200, description: 'Cart item updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  updateCartItem(
    @Param('itemId') itemId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
    @Request() req: any,
    @Headers('x-guest-cart-id') guestCartId?: string
  ) {
    const userId = req.user?.id;
    return this.cartService.updateCartItem(itemId, updateCartItemDto, userId, guestCartId);
  }

  @Patch('guest/items/:itemId')
  @ApiOperation({ summary: 'Update guest cart item quantity' })
  @ApiParam({ name: 'itemId', description: 'Cart item ID' })
  @ApiHeader({ name: 'x-guest-cart-id', required: true, description: 'Guest cart ID' })
  @ApiResponse({ status: 200, description: 'Guest cart item updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  updateGuestCartItem(
    @Param('itemId') itemId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
    @Headers('x-guest-cart-id') guestCartId: string
  ) {
    return this.cartService.updateCartItem(itemId, updateCartItemDto, undefined, guestCartId);
  }

  @Delete('items/:itemId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiParam({ name: 'itemId', description: 'Cart item ID' })
  @ApiHeader({ name: 'x-guest-cart-id', required: false, description: 'Guest cart ID for non-authenticated users' })
  @ApiResponse({ status: 200, description: 'Cart item removed successfully' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  removeCartItem(
    @Param('itemId') itemId: string,
    @Request() req: any,
    @Headers('x-guest-cart-id') guestCartId?: string
  ) {
    const userId = req.user?.id;
    return this.cartService.removeCartItem(itemId, userId, guestCartId);
  }

  @Delete('guest/items/:itemId')
  @ApiOperation({ summary: 'Remove item from guest cart' })
  @ApiParam({ name: 'itemId', description: 'Cart item ID' })
  @ApiHeader({ name: 'x-guest-cart-id', required: true, description: 'Guest cart ID' })
  @ApiResponse({ status: 200, description: 'Guest cart item removed successfully' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  removeGuestCartItem(
    @Param('itemId') itemId: string,
    @Headers('x-guest-cart-id') guestCartId: string
  ) {
    return this.cartService.removeCartItem(itemId, undefined, guestCartId);
  }

  @Delete('clear')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clear all items from cart' })
  @ApiHeader({ name: 'x-guest-cart-id', required: false, description: 'Guest cart ID for non-authenticated users' })
  @ApiResponse({ status: 200, description: 'Cart cleared successfully' })
  clearCart(
    @Request() req: any,
    @Headers('x-guest-cart-id') guestCartId?: string
  ) {
    const userId = req.user?.id;
    return this.cartService.clearCart(userId, guestCartId);
  }

  @Delete('guest/:cartId/clear')
  @ApiOperation({ summary: 'Clear all items from guest cart' })
  @ApiParam({ name: 'cartId', description: 'Guest cart ID' })
  @ApiResponse({ status: 200, description: 'Guest cart cleared successfully' })
  clearGuestCart(@Param('cartId') cartId: string) {
    return this.cartService.clearCart(undefined, cartId);
  }

  @Post('merge/:guestCartId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Merge guest cart with user cart after login' })
  @ApiParam({ name: 'guestCartId', description: 'Guest cart ID to merge' })
  @ApiResponse({ status: 200, description: 'Carts merged successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  mergeGuestCart(
    @Param('guestCartId') guestCartId: string,
    @Request() req: any
  ) {
    const userId = req.user.id;
    return this.cartService.mergeGuestCart(guestCartId, userId);
  }
}