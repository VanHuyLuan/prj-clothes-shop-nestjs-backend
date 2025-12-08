import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IdentitiesModule } from './identities/identities.module';
import { CachingModule } from '../cross_cuttings/caching';
import { LoggerModule } from '../cross_cuttings/logger/logger.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { UploadModule } from './upload/upload.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { AddressModule } from './address/address.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    IdentitiesModule,
    CachingModule,
    LoggerModule,
    CloudinaryModule,
    UploadModule,
    ProductsModule,
    CategoriesModule,
    CartModule,
    OrdersModule,
    AddressModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
