import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateUserResponse, UserResponse } from './identities.dto';
import { Prisma } from 'generated/prisma';

@Injectable()
export class IdentitiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(data: Prisma.UserCreateInput, hashedPassword: string): Promise<CreateUserResponse> {
    const user = await this.prisma.user.create({
      data: {
        ...data,
        accounts: {
          create: {
            provider: 'local',
            providerAccountId: data.email ?? '', 
            password: hashedPassword
          } as Prisma.AccountCreateWithoutUserInput
        },
      },
      select: {
        id: true,
        email: true,
        phone: true,
        username: true
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
                accounts: {
                    select: {
                        password: true
                    }
                },
                role: {
                    select: {
                        name: true
                    }
                }
              }
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
                accounts: {
                    select: {
                        password: true
                    }
                },
                role: {
                    select: {
                        name: true
                    }
                }
            }
        });
    }
}
