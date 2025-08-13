import { Module } from '@nestjs/common';
import { IdentitiesController } from './identities.controller';
import { IdentitiesService } from './identities.service';
import { IdentitiesRepository } from './identities.repository';
import { PrismaService } from 'src/prisma.service';
import { JwtModule } from '@nestjs/jwt';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '60s' },
    }),
    RedisModule
  ],
  controllers: [IdentitiesController],
  providers: [IdentitiesService, IdentitiesRepository, PrismaService]
})
export class IdentitiesModule {}
