import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createAddressDto: CreateAddressDto) {
    try {
      const address = await this.prisma.address.create({
        data: {
          ...createAddressDto,
          user_id: userId
        },
        include: {
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

      return address;
    } catch (error) {
      throw new BadRequestException('Failed to create address');
    }
  }

  async findAllByUser(userId: string) {
    const addresses = await this.prisma.address.findMany({
      where: { user_id: userId },
      orderBy: { id: 'desc' }
    });

    return addresses;
  }

  async findOne(id: string, userId?: string) {
    const where: any = { id };
    
    // If userId provided, ensure address belongs to user
    if (userId) {
      where.user_id = userId;
    }

    const address = await this.prisma.address.findFirst({
      where,
      include: {
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

    if (!address) {
      throw new NotFoundException(`Address with ID ${id} not found`);
    }

    return address;
  }

  async findAll() {
    // Admin only - get all addresses
    const addresses = await this.prisma.address.findMany({
      include: {
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
      orderBy: { id: 'desc' }
    });

    return addresses;
  }

  async update(id: string, updateAddressDto: UpdateAddressDto, userId?: string) {
    // Verify address exists and user has permission
    await this.findOne(id, userId);

    try {
      const address = await this.prisma.address.update({
        where: { id },
        data: updateAddressDto,
        include: {
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

      return address;
    } catch (error) {
      throw new BadRequestException('Failed to update address');
    }
  }

  async remove(id: string, userId?: string) {
    // Verify address exists and user has permission
    await this.findOne(id, userId);

    try {
      await this.prisma.address.delete({
        where: { id }
      });

      return { message: 'Address deleted successfully' };
    } catch (error) {
      throw new BadRequestException('Failed to delete address');
    }
  }

  async getAddressStats() {
    // Admin only - get address statistics
    const totalAddresses = await this.prisma.address.count();
    
    const addressesByCountry = await this.prisma.address.groupBy({
      by: ['country'],
      _count: {
        country: true
      },
      orderBy: {
        _count: {
          country: 'desc'
        }
      }
    });

    const addressesByCity = await this.prisma.address.groupBy({
      by: ['city', 'country'],
      _count: {
        city: true
      },
      orderBy: {
        _count: {
          city: 'desc'
        }
      },
      take: 10
    });

    return {
      totalAddresses,
      addressesByCountry,
      topCities: addressesByCity
    };
  }
}