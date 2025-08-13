import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IdentitiesModule } from './identities/identities.module';
import { RedisModule } from './redis.module';

@Module({
  imports: [IdentitiesModule, RedisModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
