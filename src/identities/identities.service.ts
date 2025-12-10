import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import {
  CreateUserByAdminDto,
  CreateUserByAdminResponse,
  CreateUserDto,
  CreateUserResponse,
  LoginDto,
  ChangePasswordDto,
  UserInfo,
  UserResponse,
  UpdateUserDto,
  UpdateUserResponse,
  UpdateAddressDto,
  UpdateAddressResponse,
} from './dto/identities.dto';
import { Prisma } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { CachingService } from '../../cross_cuttings/caching';
import { LoggerService } from '../../cross_cuttings/logger';
import { MailService } from '../mail/mail.service';

@Injectable()
export class IdentitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private jwtService: JwtService,
    private readonly cachingService: CachingService,
    private readonly logger: LoggerService,
    private readonly mailService: MailService,
  ) {}

  async createUser(input: CreateUserDto): Promise<CreateUserResponse> {
    // Check phone and email exists
    const existUser =
      (await this.findUserByEmail(input.email)) ||
      (await this.findUserByPhone(input.phone));
    if (existUser) {
      throw new BadRequestException('Email or phone already exists');
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

    // 3. Tạo user + account
    const user = await this.prisma.user.create({
      data: {
        ...userData,
        accounts: {
          create: {
            provider: 'local',
            providerAccountId: userData.email ?? '',
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

  async updateUser(userId: string, input: UpdateUserDto): Promise<UpdateUserResponse> {
    // Check user exists
    const existUser = await this.findUserById(userId);
    if (!existUser) {
      throw new BadRequestException('User not found');
    }

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: input.email,
        phone: input.phone,
        firstName: input.firstname,
        lastName: input.lastname,
        avatar: input.avatar, 
      },
      select: {
        id: true,
        email: true,
        phone: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
      },
    });

    return updatedUser;
  }

  async createUserbyAdmin(input: CreateUserByAdminDto): Promise<CreateUserByAdminResponse> {
    // Check phone and email exists
    const existUser =
      (await this.findUserByEmail(input.email)) ||
      (await this.findUserByPhone(input.phone));
    if (existUser) {
      throw new BadRequestException('Email or phone already exists');
    }

    // 1. Hash password
    const hashedPassword = await this.encryptPassword("Clothesshop123@", 10);

    // Find role_id from role name
    const role = await this.prisma.role.findUnique({
      where: { name: input.role },
    });
    if (!role) {
      throw new BadRequestException('Role not found');
    }
    const roleId = role.id;

    // 2. Chuẩn bị dữ liệu cho Prisma.UserCreateInput
    const userData: Prisma.UserCreateInput = {
      email: input.email,
      phone: input.phone,
      username: input.username,
      firstName: input.firstname,
      lastName: input.lastname,
      role: {
        connect: { id: roleId },
      },
    };
    
    // 3. Tạo user + account
    const user = await this.prisma.user.create({
      data: {
        ...userData,
        accounts: {
          create: {
            provider: 'local',
            providerAccountId: userData.email ?? '',
            password: hashedPassword,
          } as Prisma.AccountCreateWithoutUserInput,
        },
      },
      select: {
        id: true,
        email: true,
        phone: true,
        username: true,
        firstName: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });
    
    // 4. Gửi email thông báo tài khoản
    if (user.email) {
      await this.mailService.sendUserCredentials(
        user.email,
        user.username,
        'Clothesshop123@', // Mật khẩu mặc định
        user.firstName ?? undefined,
      );
    }
    
    return user;
  }

  async deleteUserByAdmin(userId: string): Promise<void> {
    // Check user exists
    const user = await this.findUserById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    
    // Delete user
    await this.prisma.user.delete({
      where: { id: userId },
    });
  }

  async resetPasswordByAdmin(userId: string): Promise<void> {
    // Check user exists
    const user = await this.findUserById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const defaultPassword = 'Clothesshop123@';
    // 1. Mã hóa mật khẩu mới
    const newHashedPassword = await this.encryptPassword(
      defaultPassword,
      10,
    );
    this.logger.log(
      `New hashed password for user ${userId}: ${newHashedPassword}`,
    );
    // 2. Cập nhật mật khẩu trong database
    await this.prisma.account.updateMany({
      where: {
        user_id: userId,
        provider: 'local',
      },
      data: {
        password: newHashedPassword,
      },
    });

    // 3. Gửi email thông báo tài khoản
    if (user.email) {
      await this.mailService.sendResetPasswordByAdminEmail(
        user.email,
        user.username,
        defaultPassword, // Mật khẩu mặc định
        user.firstName ?? undefined,
      );
    }
  }

  async login(
    loginDTO: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    // 1. Tìm user
    const user = await this.findUserByEmail(loginDTO.email);
    if (!user) throw new BadRequestException('Email not found');

    // Check if user is active
    if (user.status === false) {
      throw new BadRequestException('User account is deactivated');
    }

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
      const user = await this.findUserById(payload.id);
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

  async listUsers(query: any): Promise<any> {
    this.logger.log('Listing all users');
    
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const sortBy = query.sortBy || 'created_at';
    const sortOrder = query.sortOrder || 'desc';
    const role_id = query.role_id;

    const skip = (page - 1) * limit;

    const where: any = {};
    if (role_id) {
      where.role_id = role_id;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          phone: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true,
          status: true,
          created_at: true,
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    // 1. Tìm user
    const user = await this.findUserById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // 2. Kiểm tra mật khẩu cũ
    const isOldPasswordValid = await this.decryptPassword(
      changePasswordDto.old_password,
      user.accounts[0].password,
    );
    if (!isOldPasswordValid) {
      throw new BadRequestException('Old password is incorrect');
    }
    
    // 1. Mã hóa mật khẩu mới
    const newHashedPassword = await this.encryptPassword(
      changePasswordDto.new_password,
      10,
    );
    this.logger.log(
      `New hashed password for user ${userId}: ${newHashedPassword}`,
    );
    // 2. Cập nhật mật khẩu trong database
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

  async setUserStatus(userId: string, status: boolean): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { status },
    });
  }

  async getFullProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        avatar: true,
        status: true,
        created_at: true,
        updated_at: true,
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        address: {
          select: {
            id: true,
            street: true,
            city: true,
            state: true,
            zip: true,
            country: true,
          },
        },
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }

  // Private helper methods
  private async findUserByEmail(email: string): Promise<UserResponse | null> {
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
        status: true,
      },
    });
  }

  private async findUserByPhone(phone: string): Promise<UserResponse | null> {
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
        status: true,
      },
    });
  }

  private async findUserById(id: string): Promise<UserResponse | null> {
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
        status: true,
      },
    });
  }

  private async encryptPassword(plainText: string, saltRounds: number) {
    return bcrypt.hash(plainText, saltRounds);
  }

  private async decryptPassword(plainText, hash) {
    return bcrypt.compare(plainText, hash);
  }
}
