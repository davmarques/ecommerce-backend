import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

@Module({
  imports: [PrismaModule, TenancyModule],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, TokenService],
  exports: [AuthGuard, AuthService, TokenService],
})
export class AuthModule {}