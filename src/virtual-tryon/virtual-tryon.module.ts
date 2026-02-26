import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VirtualTryonController } from './virtual-tryon.controller';
import { VirtualTryonService } from './virtual-tryon.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [ConfigModule, CloudinaryModule],
  controllers: [VirtualTryonController],
  providers: [VirtualTryonService],
  exports: [VirtualTryonService],
})
export class VirtualTryonModule {}
