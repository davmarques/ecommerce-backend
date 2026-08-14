import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { FavoritesModule } from './favorites/favorites.module';
import { TenancyModule } from './tenancy/tenancy.module';
import { StoreConfigModule } from './store-config/store-config.module';
import { CrmModule } from './crm/crm.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    TenancyModule,
    AuthModule,
    ProductsModule,
    CategoriesModule,
    FavoritesModule,
    StoreConfigModule,
    CrmModule,
  ],
})
export class AppModule {}
