import { Module } from '@nestjs/common';
import { IdentitiesController } from './identities.controller';
import { IdentitiesService } from './identities.service';
import { IdentitiesRepository } from './identities.repository';
import { PrismaService } from 'src/prisma.service';
import { JwtModule } from '@nestjs/jwt';
import { LoggerModule } from '../../cross_cuttings/logger/logger.module';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '60s' },
    }),
    LoggerModule,
  ],
  controllers: [IdentitiesController],
  providers: [IdentitiesService, IdentitiesRepository, PrismaService],
})
export class IdentitiesModule {}
