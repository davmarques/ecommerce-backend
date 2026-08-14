import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { StoreConfigController } from './store-config.controller';
import { StoreConfigService } from './store-config.service';

@Module({
  imports: [AuthModule, TenancyModule],
  controllers: [StoreConfigController],
  providers: [StoreConfigService],
  exports: [StoreConfigService],
})
export class StoreConfigModule {}
