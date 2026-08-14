import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';

@Module({
  imports: [AuthModule, TenancyModule],
  controllers: [CrmController],
  providers: [CrmService],
})
export class CrmModule {}
