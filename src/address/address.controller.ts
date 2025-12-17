import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam
} from '@nestjs/swagger';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../identities/roles/roles.guard';
import { Roles } from '../identities/roles/roles.decorator';

@ApiTags('Address')
@Controller('address')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new address for current user' })
  @ApiResponse({ status: 201, description: 'Address created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createAddressDto: CreateAddressDto, @Request() req: any) {
    const userId = req.user.id;
    return this.addressService.create(userId, createAddressDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get current user addresses' })
  @ApiResponse({ status: 200, description: 'Addresses retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findUserAddresses(@Request() req: any) {
    const userId = req.user.id;
    return this.addressService.findAllByUser(userId);
  }

  @Get('all')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get all addresses (admin only)' })
  @ApiResponse({ status: 200, description: 'All addresses retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  findAll() {
    return this.addressService.findAll();
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get address statistics (admin only)' })
  @ApiResponse({ status: 200, description: 'Address statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  getStats() {
    return this.addressService.getAddressStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get address by ID' })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiResponse({ status: 200, description: 'Address found' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOne(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.role === 'admin' ? undefined : req.user.id;
    return this.addressService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update address' })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiResponse({ status: 200, description: 'Address updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  update(
    @Param('id') id: string,
    @Body() updateAddressDto: UpdateAddressDto,
    @Request() req: any
  ) {
    const userId = req.user.role === 'admin' ? undefined : req.user.id;
    return this.addressService.update(id, updateAddressDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete address' })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiResponse({ status: 200, description: 'Address deleted successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  remove(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.role === 'admin' ? undefined : req.user.sub;
    return this.addressService.remove(id, userId);
  }
}