import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IdentitiesRepository } from './identities.repository';
import {
  CreateUserDto,
  CreateUserResponse,
  LoginDto,
  ResetPasswordDto,
  UserInfo,
} from './identities.dto';
import { Prisma } from 'generated/prisma';
import { JwtService } from '@nestjs/jwt';
import { CachingService } from '../../cross_cuttings/caching';
import { LoggerService } from '../../cross_cuttings/logger';

@Injectable()
export class IdentitiesService {
  constructor(
    private identitiesRepository: IdentitiesRepository,
    private jwtService: JwtService,
    private readonly cachingService: CachingService,
    private readonly logger: LoggerService,
  ) {}

  async createUser(input: CreateUserDto): Promise<CreateUserResponse> {
    // Check phone and email exists
    const existUser =
      (await this.identitiesRepository.findUserByEmail(input.email)) ||
      (await this.identitiesRepository.findUserByPhone(input.phone));
    if (existUser) {
      throw (
        new BadRequestException('Email or phone already exists'),
        {
          cause: new Error('Email or phone already exists'),
          description: 'User already exists',
        }
      );
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
        connect: { name: 'user' },
      },
    };

    // 3. Gọi repository để tạo user + account
    return this.identitiesRepository.createUser(userData, hashedPassword);
  }

  async login(
    loginDTO: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    // 1. Tìm user
    const user = await this.identitiesRepository.findUserByEmail(
      loginDTO.email,
    );
    if (!user) throw new BadRequestException('Email not found');

    // 2. Check password
    const isPasswordValid = await this.decryptPassword(
      loginDTO.password,
      user.accounts[0].password,
    );
    if (!isPasswordValid)
      throw new BadRequestException('Password is incorrect');

    // 3. Payload JWT
    const tokenPayload = {
      email: user.email,
      id: user.id,
      firstname: user.firstName,
      lastname: user.lastName,
      username: user.username,
      phone: user.phone,
      role: user.role.name,
    };

    // 4. Sinh Access Token (1h)
    const accessToken = await this.jwtService.signAsync(tokenPayload, {
      expiresIn: '1h',
      secret: process.env.JWT_SECRET,
    });

    // 5. Sinh Refresh Token (7 ngày)
    const refreshToken = await this.jwtService.signAsync(
      { id: user.id },
      {
        expiresIn: '7d',
        secret: process.env.JWT_REFRESH_SECRET,
      },
    );

    // 6. Lưu refresh token vào cache (để revoke được)
    await this.cachingService.saveCacheWithPrefix(
      'refreshToken',
      user.id,
      refreshToken,
      7 * 24 * 60 * 60,
    );

    // 7. Lưu access token để logout
    await this.cachingService.saveCacheWithPrefix(
      'token',
      user.id,
      accessToken,
      3600,
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // FE biết thời gian sống của access token
    };
  }

  async refreshToken(
    oldRefreshToken: string,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      // 1. Verify refresh token
      const payload = await this.jwtService.verifyAsync<{ id: string }>(
        oldRefreshToken,
        {
          secret: process.env.JWT_REFRESH_SECRET,
        },
      );

      // 2. Lấy refresh token từ cache
      const storedRefreshToken =
        await this.cachingService.getCacheWithPrefix<string>(
          'refreshToken',
          payload.id,
        );
      if (!storedRefreshToken || storedRefreshToken !== oldRefreshToken) {
        throw new BadRequestException('Invalid refresh token');
      }

      // 3. Tìm user
      const user = await this.identitiesRepository.findUserById(payload.id);
      if (!user) throw new BadRequestException('User not found');

      // 4. Sinh access token mới
      const tokenPayload = {
        email: user.email,
        id: user.id,
        firstname: user.firstName,
        lastname: user.lastName,
        username: user.username,
        phone: user.phone,
        role: user.role.name,
      };

      const newAccessToken = await this.jwtService.signAsync(tokenPayload, {
        expiresIn: '1h',
        secret: process.env.JWT_SECRET,
      });

      await this.cachingService.saveCacheWithPrefix(
        'token',
        user.id,
        newAccessToken,
        3600,
      );

      return {
        accessToken: newAccessToken,
        expiresIn: 3600,
      };
    } catch (error) {
      throw new BadRequestException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    await this.cachingService.removeCacheWithPrefix('token', userId);
    await this.cachingService.removeCacheWithPrefix('refreshToken', userId);
    return { message: 'Logged out successfully' };
  }

  async listUsers(): Promise<UserInfo[]> {
    this.logger.log('Listing all users');
    return this.identitiesRepository.listUsers();
  }

  async resetPassword(
    userId: string,
    resetPasswordDto: ResetPasswordDto,
  ): Promise<void> {
    // 1. Mã hóa mật khẩu mới
    const newHashedPassword = await this.encryptPassword(
      resetPasswordDto.password,
      10,
    );
    this.logger.log(
      `New hashed password for user ${userId}: ${newHashedPassword}`,
    );
    // 2. Cập nhật mật khẩu trong database
    await this.identitiesRepository.resetPassword(userId, newHashedPassword);
  }

  private async encryptPassword(plainText: string, saltRounds: number) {
    return bcrypt.hash(plainText, saltRounds);
  }

  private async decryptPassword(plainText, hash) {
    return bcrypt.compare(plainText, hash);
  }
}
