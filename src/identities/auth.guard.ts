import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    @InjectRedis() private readonly redis: Redis
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean>  {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    try{
      const payload = await this.jwtService.verifyAsync(token,
        {
          secret: process.env.JWT_SECRET,
        }
      );
      // Check token trong Redis
      const cachedToken = await this.redis.get(`token:${payload.id}`);
      if (cachedToken !== token) {
        throw new UnauthorizedException('Token expired or invalid');
      }

      request['user'] = payload;
    } catch {
      throw new UnauthorizedException();
    } 
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') || [];
    return type === 'Bearer' ? token : undefined;
  }
}
