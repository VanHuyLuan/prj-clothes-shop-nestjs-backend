import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../identities/roles/roles.guard';
import { Roles } from '../identities/roles/roles.decorator';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get all inventory variants with pagination and filters' })
  getInventory(@Query() query: InventoryQueryDto) {
    return this.inventoryService.getInventory(query);
  }

  @Patch(':variantId')
  @ApiOperation({ summary: 'Update stock quantity for a variant' })
  updateStock(
    @Param('variantId') variantId: string,
    @Body('stock_qty') stock_qty: number,
  ) {
    return this.inventoryService.updateStock(variantId, Number(stock_qty));
  }
}
