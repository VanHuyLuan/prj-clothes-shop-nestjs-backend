import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { CreateUserDto, LoginDto,ChangePasswordDto, CreateUserByAdminDto } from './dto/identities.dto';
import { IdentitiesService } from './identities.service';
import { AuthGuard } from '../auth/auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from './roles/roles.guard';
import { Roles } from './roles/roles.decorator';
import { GoogleOAuthGuard } from '../auth/google-oauth.guard';

@ApiTags('identities')
@Controller('identities')
export class IdentitiesController {
  constructor(private identitiesService: IdentitiesService) {}

  @Post('/createuser')
  async createNewUser(@Body() createUserDto: CreateUserDto) {
    return await this.identitiesService.createUser(createUserDto);
  }

  @Post('/createuser-by-admin')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('admin')
  async createUserByAdmin(@Body() createUserByAdminDto: CreateUserByAdminDto) {
    return await this.identitiesService.createUserbyAdmin(createUserByAdminDto);
  }

  @Post('/login')
  async login(@Body() loginDto: LoginDto) {
    return await this.identitiesService.login(loginDto);
  }

  @Post('/refresh-token')
  async refreshToken(@Body('refreshToken') refreshToken: string) {
    return await this.identitiesService.refreshToken(refreshToken);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Post('/logout')
  async logout(@Request() req) {
    const userId = req.user.id;
    return await this.identitiesService.logout(userId);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Get('/profile')
  async getProfile(@Request() req) {
    const userId = req.user.id;
    return await this.identitiesService.getFullProfile(userId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Get('/list-users')
  @Roles('admin')
  async listUsers(@Query() query: any) {
    return this.identitiesService.listUsers(query);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Post('/change-password')
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const userId = req.user.id;
    return this.identitiesService.changePassword(userId, changePasswordDto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Post('/set-user-status')
  @Roles('admin')
  async setUserStatus(@Query('userId') userId: string, @Query('status') status: string) {
    const statusBoolean = status === 'true' || status === '1';
    return this.identitiesService.setUserStatus(userId, statusBoolean);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Post('/update-user')
  async updateUser(@Request() req, @Body() updateUserDto: any) {
    const userId = req.user.id;
    return this.identitiesService.updateUser(userId, updateUserDto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Post('/delete-user')
  @Roles('admin')
  async deleteUser(@Query('userId') userId: string) {
    return this.identitiesService.deleteUserByAdmin(userId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Post('/reset-password-by-admin')
  @Roles('admin')
  async resetPasswordByAdmin(@Query('userId') userId: string) {
    return this.identitiesService.resetPasswordByAdmin(userId);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Post('/set-avatar')
  async setAvatar(@Request() req, @Body('avatarUrl') avatarUrl: string) {
    const userId = req.user.id;
    return this.identitiesService.updateAvatar(userId, avatarUrl);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Get('/user/:id')
  @Roles('admin')
  async getUserById(@Param('id') id: string) {
    return this.identitiesService.getFullProfile(id);
  }

  @Post('/forgot-password')
  async forgotPassword(@Body('email') email: string) {
    await this.identitiesService.forgotPassword(email);
    // Luôn trả về 200 để tránh email enumeration
    return { message: 'If this email exists, a reset link has been sent.' };
  }

  @Post('/reset-password')
  async resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ) {
    await this.identitiesService.resetPassword(token, newPassword);
    return { message: 'Password has been reset successfully.' };
  }

  // ─── Google OAuth ───────────────────────────────────────────────────────────

  @Get('/auth/google')
  @UseGuards(GoogleOAuthGuard)
  async googleAuth() {
    // Passport tự redirect sang Google, không cần xử lý gì thêm
  }

  @Get('/auth/google/callback')
  @UseGuards(GoogleOAuthGuard)
  async googleAuthCallback(@Request() req, @Res() res: Response) {
    const tokens = await this.identitiesService.googleLogin(req.user);

    // Redirect về frontend kèm token trong query string
    // (Frontend đọc token từ URL và lưu vào localStorage/cookie)
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const redirectUrl =
      `${frontendUrl}/auth/google/callback` +
      `?accessToken=${tokens.accessToken}` +
      `&refreshToken=${tokens.refreshToken}` +
      `&expiresIn=${tokens.expiresIn}`;

    return res.redirect(redirectUrl);
  }
}