import { Module } from '@nestjs/common';
import { IdentitiesController } from './identities.controller';
import { IdentitiesService } from './identities.service';
import { PrismaService } from 'src/prisma.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { LoggerModule } from '../../cross_cuttings/logger/logger.module';
import { MailModule } from '../mail/mail.module';
import { GoogleStrategy } from '../auth/google.strategy';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '60s' },
    }),
    PassportModule,
    LoggerModule,
    MailModule,
  ],
  controllers: [IdentitiesController],
  providers: [IdentitiesService, PrismaService, GoogleStrategy],
})
export class IdentitiesModule {}
