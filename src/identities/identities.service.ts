import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
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
import { JwtService } from '@nestjs/jwt';
import { CachingService } from '../../cross_cuttings/caching';
import { LoggerService } from '../../cross_cuttings/logger';
import { MailService } from '../mail/mail.service';
import { GoogleProfile } from '../auth/google.strategy';

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

    // 3. Tạo user + account
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        phone: input.phone,
        username: input.username,
        firstName: input.firstname,
        lastName: input.lastname,
        role: { connect: { name: 'user' } },
        accounts: {
          create: {
            provider: 'local',
            providerAccountId: input.email ?? '',
            password: hashedPassword,
          },
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
        gender: input.gender,
        birthday: input.birthday ? new Date(input.birthday) : null,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        gender: true,
        birthday: true,
      },
    });

    return {
      ...updatedUser,
      birthday: updatedUser.birthday ? updatedUser.birthday.toISOString() : null,
    };
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

    // 3. Tạo user + account
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        phone: input.phone,
        username: input.username,
        firstName: input.firstname,
        lastName: input.lastname,
        role: { connect: { id: roleId } },
        accounts: {
          create: {
            provider: 'local',
            providerAccountId: input.email ?? '',
            password: hashedPassword,
          },
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

  async updateUserByAdmin(userId: string, input: UpdateUserDto): Promise<UpdateUserResponse> {
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
        gender: input.gender,
        birthday: input.birthday ? new Date(input.birthday) : null,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        gender: true,
        birthday: true,
      },
    });

    return {
      ...updatedUser,
      birthday: updatedUser.birthday ? updatedUser.birthday.toISOString() : null,
    };
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
    const localAccount = user.accounts[0];
    if (!localAccount) {
      throw new BadRequestException('This account was created with Google. Please sign in with Google.');
    }
    const isPasswordValid = await this.decryptPassword(
      loginDTO.password,
      localAccount.password,
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

  async updateAvatar(userId: string, avatarUrl: string): Promise<void> {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
    });
  }

  async googleLogin(
    profile: GoogleProfile,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    // 1. Tìm account google theo providerAccountId
    const existingAccount = await this.prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'google',
          providerAccountId: profile.googleId,
        },
      },
      include: {
        user: {
          include: {
            role: true,
          },
        },
      },
    });

    let user: any;

    if (existingAccount) {
      // Đã có tài khoản google → lấy user
      user = existingAccount.user;
    } else {
      // Kiểm tra xem email đã được dùng bởi tài khoản local chưa
      const existingUser = await this.prisma.user.findUnique({
        where: { email: profile.email },
        include: { role: true },
      });

      if (existingUser) {
        // Liên kết tài khoản google với user hiện có
        await this.prisma.account.create({
          data: {
            provider: 'google',
            providerAccountId: profile.googleId,
            user_id: existingUser.id,
          },
        });

        // Cập nhật avatar nếu chưa có
        if (!existingUser.avatar && profile.avatar) {
          await this.prisma.user.update({
            where: { id: existingUser.id },
            data: { avatar: profile.avatar },
          });
        }

        user = existingUser;
      } else {
        // Tạo user mới từ Google profile
        const baseUsername = profile.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
        let username = baseUsername;
        let suffix = 1;
        while (await this.prisma.user.findUnique({ where: { username } })) {
          username = `${baseUsername}${suffix++}`;
        }

        const newUser = await this.prisma.user.create({
          data: {
            email: profile.email,
            username,
            firstName: profile.firstName,
            lastName: profile.lastName,
            avatar: profile.avatar,
            role: { connect: { name: 'user' } },
            accounts: {
              create: {
                provider: 'google',
                providerAccountId: profile.googleId,
              },
            },
          },
          include: { role: true },
        });

        user = newUser;
      }
    }

    if (user.status === false) {
      throw new BadRequestException('User account is deactivated');
    }

    // Sinh token
    const tokenPayload = {
      email: user.email,
      id: user.id,
      firstname: user.firstName,
      lastname: user.lastName,
      username: user.username,
      phone: user.phone,
      role: user.role.name,
    };

    const accessToken = await this.jwtService.signAsync(tokenPayload, {
      expiresIn: '1h',
      secret: process.env.JWT_SECRET,
    });

    const refreshToken = await this.jwtService.signAsync(
      { id: user.id },
      {
        expiresIn: '7d',
        secret: process.env.JWT_REFRESH_SECRET,
      },
    );

    await this.cachingService.saveCacheWithPrefix('refreshToken', user.id, refreshToken, 7 * 24 * 60 * 60);
    await this.cachingService.saveCacheWithPrefix('token', user.id, accessToken, 3600);

    return { accessToken, refreshToken, expiresIn: 3600 };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.findUserByEmail(email);
    // Không báo lỗi nếu email không tồn tại — tránh email enumeration
    if (!user) return;

    if (user.status === false) {
      throw new BadRequestException('User account is deactivated');
    }

    // Tạo token ngẫu nhiên, TTL 15 phút
    const token = crypto.randomBytes(32).toString('hex');
    await this.cachingService.saveCacheWithPrefix(
      'resetPasswordToken',
      token,
      user.id,
      15 * 60,
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    await this.mailService.sendForgotPasswordEmail(
      user.email ?? '',
      user.username,
      resetLink,
      user.firstName ?? undefined,
    );
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Lấy userId từ cache theo token
    const userId = await this.cachingService.getCacheWithPrefix<string>(
      'resetPasswordToken',
      token,
    );

    if (!userId) {
      throw new BadRequestException('Reset token is invalid or has expired');
    }

    const user = await this.findUserById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Đổi mật khẩu
    const hashedPassword = await this.encryptPassword(newPassword, 10);
    await this.prisma.account.updateMany({
      where: { user_id: userId, provider: 'local' },
      data: { password: hashedPassword },
    });

    // Xóa token khỏi cache ngay sau khi dùng
    await this.cachingService.removeCacheWithPrefix('resetPasswordToken', token);
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

    const search = query.search;
    const where: any = {};
    if (role_id) {
      where.role_id = role_id;
    }
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
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

    const userIds = users.map((u) => u.id);

    const [orderCounts, orderSpent] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['user_id'],
        where: { user_id: { in: userIds } },
        _count: { id: true },
        _max: { created_at: true },
      }),
      this.prisma.order.groupBy({
        by: ['user_id'],
        where: { user_id: { in: userIds }, status: { notIn: ['cancelled'] } },
        _sum: { total_amount: true },
      }),
    ]);

    const countMap = new Map(orderCounts.map((r) => [r.user_id, r]));
    const spentMap = new Map(orderSpent.map((r) => [r.user_id, r]));

    const data = users.map((u) => {
      const counts = countMap.get(u.id);
      const spent = spentMap.get(u.id);
      return {
        ...u,
        totalOrders: counts?._count.id ?? 0,
        totalSpent: Number(spent?._sum.total_amount ?? 0),
        lastOrder: counts?._max.created_at ?? null,
      };
    });

    return {
      data,
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
    const localAccount = user.accounts[0];
    if (!localAccount) {
      throw new BadRequestException('This account uses Google login and has no password to change.');
    }
    const isOldPasswordValid = await this.decryptPassword(
      changePasswordDto.old_password,
      localAccount.password,
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
        gender: true,
        birthday: true,
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
        gender: true,
        birthday: true,
        accounts: {
          where: { provider: 'local' },
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
        gender: true,
        birthday: true,
        accounts: {
          where: { provider: 'local' },
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
        gender: true,
        birthday: true,
        accounts: {
          where: { provider: 'local' },
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
