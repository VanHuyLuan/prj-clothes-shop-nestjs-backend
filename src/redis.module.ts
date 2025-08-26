// redis.module.ts
import { Module, Global } from '@nestjs/common';
import { RedisModule as NestRedisModule } from '@nestjs-modules/ioredis';

@Global()
@Module({
  imports: [
    NestRedisModule.forRoot({
      type: 'single', // dùng single node
      options: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
        retryStrategy: times => Math.min(times * 200, 2000),
      },
    }),
  ],
  exports: [NestRedisModule],
})
export class RedisModule {}
