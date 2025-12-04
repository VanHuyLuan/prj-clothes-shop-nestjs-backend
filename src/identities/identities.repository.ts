import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateUserResponse, UserInfo, UserResponse } from './identities.dto';
import { Prisma } from 'generated/prisma';

@Injectable()
export class IdentitiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(
    data: Prisma.UserCreateInput,
    hashedPassword: string,
  ): Promise<CreateUserResponse> {
    const user = await this.prisma.user.create({
      data: {
        ...data,
        accounts: {
          create: {
            provider: 'local',
            providerAccountId: data.email ?? '',
            password: hashedPassword,
          } as Prisma.AccountCreateWithoutUserInput,
        },
      },
      select: {
        id: true,
        email: true,
        phone: true,
        username: true,
      },
    });
    return user;
  }

  async findUserByEmail(email: string): Promise<UserResponse | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        phone: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        accounts: {
          select: {
            password: true,
          },
        },
        role: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  async findUserByPhone(phone: string): Promise<UserResponse | null> {
    return this.prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        email: true,
        phone: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        accounts: {
          select: {
            password: true,
          },
        },
        role: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  async findUserById(id: string): Promise<UserResponse | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        accounts: {
          select: {
            password: true,
          },
        },
        role: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  async resetPassword(
    userId: string,
    newHashedPassword: string,
  ): Promise<void> {
    await this.prisma.account.updateMany({
      where: {
        user_id: userId,
        provider: 'local',
      },
      data: {
        password: newHashedPassword,
      },
    });
  }

  async listUsers(): Promise<UserInfo[]> {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        phone: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        status: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });
  }
}
