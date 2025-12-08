import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiHeader
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto, CreateOrderFromCartDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../identities/roles/roles.guard';
import { Roles } from '../identities/roles/roles.decorator';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create order directly from items' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Post('checkout')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create order from cart (checkout)' })
  @ApiResponse({ status: 201, description: 'Order created from cart successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Cart is empty or invalid' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  createFromCart(
    @Body() createOrderFromCartDto: CreateOrderFromCartDto,
    @Request() req: any
  ) {
    const userId = req.user.sub;
    return this.ordersService.createFromCart(createOrderFromCartDto, userId);
  }

  @Post('guest/checkout')
  @ApiOperation({ summary: 'Create order from guest cart' })
  @ApiResponse({ status: 201, description: 'Guest order created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Cart is empty or invalid' })
  createFromGuestCart(@Body() createOrderFromCartDto: CreateOrderFromCartDto) {
    return this.ordersService.createFromCart(createOrderFromCartDto);
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all orders (admin only)' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  findAll(@Query() query: OrderQueryDto, @Request() req: any) {
    return this.ordersService.findAll(query, req.user.role, req.user.sub);
  }

  @Get('my-orders')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user orders' })
  @ApiResponse({ status: 200, description: 'User orders retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getUserOrders(@Query() query: OrderQueryDto, @Request() req: any) {
    const userId = req.user.sub;
    return this.ordersService.getUserOrders(userId, query);
  }

  @Get('order-number/:orderNumber')
  @ApiOperation({ summary: 'Get order by order number' })
  @ApiParam({ name: 'orderNumber', description: 'Order number' })
  @ApiResponse({ status: 200, description: 'Order found' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  findByOrderNumber(
    @Param('orderNumber') orderNumber: string,
    @Request() req: any
  ) {
    const userRole = req.user?.role;
    const currentUserId = req.user?.sub;
    return this.ordersService.findByOrderNumber(orderNumber, userRole, currentUserId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order found' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  findOne(@Param('id') id: string, @Request() req: any) {
    const userRole = req.user?.role;
    const currentUserId = req.user?.sub;
    return this.ordersService.findOne(id, userRole, currentUserId);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order status' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  update(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @Request() req: any
  ) {
    const userRole = req.user.role;
    const currentUserId = req.user.sub;
    return this.ordersService.update(id, updateOrderDto, userRole, currentUserId);
  }

  @Patch('admin/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order status (admin only)' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  adminUpdate(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @Request() req: any
  ) {
    return this.ordersService.update(id, updateOrderDto, 'admin', req.user.sub);
  }
}