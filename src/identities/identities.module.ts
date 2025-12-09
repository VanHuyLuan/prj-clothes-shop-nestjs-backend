import { Module } from '@nestjs/common';
import { IdentitiesController } from './identities.controller';
import { IdentitiesService } from './identities.service';
import { PrismaService } from 'src/prisma.service';
import { JwtModule } from '@nestjs/jwt';
import { LoggerModule } from '../../cross_cuttings/logger/logger.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '60s' },
    }),
    LoggerModule,
    MailModule,
  ],
  controllers: [IdentitiesController],
  providers: [IdentitiesService, PrismaService],
})
export class IdentitiesModule {}
