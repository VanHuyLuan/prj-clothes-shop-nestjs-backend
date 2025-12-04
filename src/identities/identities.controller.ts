import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CreateUserDto, LoginDto, ResetPasswordDto } from './identities.dto';
import { IdentitiesService } from './identities.service';
import { AuthGuard } from './auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';

@ApiTags('identities')
@Controller('identities')
export class IdentitiesController {
  constructor(private identitiesService: IdentitiesService) {}

  @Post('/createuser')
  async createNewUser(@Body() createUserDto: CreateUserDto) {
    return await this.identitiesService.createUser(createUserDto);
  }

  @Post('/login')
  async login(@Body() loginDto: LoginDto) {
    return await this.identitiesService.login(loginDto);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Get('/profile')
  async getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Get('/list-users')
  @Roles('admin')
  async listUsers() {
    return this.identitiesService.listUsers();
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Post('/reset-password')
  async resetPassword(
    @Request() req,
    @Body() resetPasswordDto: ResetPasswordDto,
  ) {
    const userId = req.user.id;
    return this.identitiesService.resetPassword(userId, resetPasswordDto);
  }
}
