import { Body, Controller, Post, Get, UseGuards, Request } from '@nestjs/common';
import { CreateUserDto } from './identities.dto';
import { IdentitiesService } from './identities.service';
import { LoginDto } from './identities.dto';
import { AuthGuard } from './auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('identities')
@Controller('identities')
export class IdentitiesController {
    constructor(private identitiesService: IdentitiesService) {}

    @Post('/createuser')
    async createNewUser(
        @Body() createUserDto: CreateUserDto,
    ){
        return await this.identitiesService.createUser(createUserDto);
    }

    @Post('/login')
    async login(
        @Body() loginDto: LoginDto,
    ){
        return await this.identitiesService.login(loginDto);
    }

    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @Get('/profile')
    async getProfile(
        @Request() req
    ){
        return req.user;
    }
}
