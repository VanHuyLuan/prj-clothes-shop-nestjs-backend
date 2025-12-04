import { AuthGuard } from './auth.guard';
import { JwtService } from '@nestjs/jwt';

describe('AuthGuard', () => {
  it('should be defined', () => {
    const mockJwtService = {} as JwtService; // Mock JwtService
    const mockcachingService = {
      getCacheKey: (prefix: string, id: string) => `${prefix}:${id}`,
      getCache: async (key: string) => 'mockedToken',
    } as any; // Mock CachingService

    expect(new AuthGuard(mockJwtService, mockcachingService)).toBeDefined();
  });
});
