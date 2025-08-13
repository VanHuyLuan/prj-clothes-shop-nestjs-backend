import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IdentitiesRepository } from './identities.repository';
import { CreateUserDto, CreateUserResponse, LoginDto } from './identities.dto';
import { Prisma } from 'generated/prisma';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { last } from 'rxjs';

@Injectable()
export class IdentitiesService {
  constructor(
    private identitiesRepository: IdentitiesRepository,
    private jwtService: JwtService,
    @InjectRedis() private readonly redis: Redis
  ) {}

  async createUser(input: CreateUserDto): Promise<CreateUserResponse> {
    // Check phone and email exists
    const existUser = await this.identitiesRepository.findUserByEmail(input.email) || await this.identitiesRepository.findUserByPhone(input.phone);
    if (existUser) {
      throw new BadRequestException('Email or phone already exists'),
      {
        cause: new Error('Email or phone already exists'),
        description: 'User already exists',
      };
    }

    // 1. Hash password
    const hashedPassword = await this.encryptPassword(input.password, 10);

    // 2. Chuẩn bị dữ liệu cho Prisma.UserCreateInput
    const userData: Prisma.UserCreateInput = {
      email: input.email,
      phone: input.phone,
      username: input.username,
      firstName: input.firstname,
      lastName: input.lastname,
      role: {
        connect: { name: 'user' }
      }
    };

    // 3. Gọi repository để tạo user + account
    return this.identitiesRepository.createUser(userData, hashedPassword);
  }

  private async encryptPassword(plainText: string, saltRounds: number) {
    return bcrypt.hash(plainText, saltRounds);
  }

  private async decryptPassword(plainText, hash){
    return bcrypt.compare(plainText, hash);
  }

  async login(loginDTO: LoginDto): Promise<{ accessToken: string }> {
    //find user based on email
    const user = await this.identitiesRepository.findUserByEmail(loginDTO.email);
    // if there is no user we can unauthorized
    if (!user) {
      throw new BadRequestException('Email not found');
    }

    // decrypt the user password
    // match the user provided password with decrypt
    // if password not matched then send the error invalid password
    const isPasswordValid = await this.decryptPassword(loginDTO.password, user.accounts[0].password);
    if (!isPasswordValid) {
      throw new BadRequestException('Password is incorrect');
    }

    // return json web token
    const tokenPayload = {
      email: user.email,
      id: user.id,
      firstname: user.firstName,
      lastname: user.lastName,
      username: user.username,
      phone: user.phone,
    };
    const accessToken = await this.jwtService.signAsync(tokenPayload, {
      expiresIn: '1h',
      secret: process.env.JWT_SECRET
    });

    await this.redis.set(`token:${user.id}`, accessToken, 'EX', 3600);

    return { accessToken };
  }

  async logout(userId: string) {
    await this.redis.del(`token:${userId}`);
    return { message: 'Logged out successfully' };
  }
}
