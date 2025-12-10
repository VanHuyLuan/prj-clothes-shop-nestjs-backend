import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CreateUserDto, LoginDto,ChangePasswordDto, CreateUserByAdminDto } from './dto/identities.dto';
import { IdentitiesService } from './identities.service';
import { AuthGuard } from '../auth/auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from './roles/roles.guard';
import { Roles } from './roles/roles.decorator';

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
}