import { AuthGuard } from './auth.guard';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';

describe('AuthGuard', () => {
  it('should be defined', () => {
    const mockJwtService = {} as JwtService; // Mock JwtService
    const mockRedis = {} as unknown as Redis; // Mock Redis

    expect(new AuthGuard(mockJwtService, mockRedis)).toBeDefined();
  });
});
