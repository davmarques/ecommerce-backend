import { Body, Controller, Get, Headers, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from './current-user.decorator';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import type { AuthTokenPayload, LoginDto, SignupDto, UpdateProfileDto } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(@Body() body: SignupDto, @Headers('x-store-domain') storeDomain?: string) {
    return this.authService.signup(body, storeDomain);
  }

  @Post('login')
  async login(@Body() body: LoginDto, @Headers('x-store-domain') storeDomain?: string) {
    return this.authService.login(body, storeDomain);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthTokenPayload) {
    return this.authService.me(user.sub, user.tenantId);
  }

  @UseGuards(AuthGuard)
  @Patch('me')
  async updateProfile(@CurrentUser() user: AuthTokenPayload, @Body() body: UpdateProfileDto) {
    return this.authService.updateProfile(user.sub, user.tenantId, body);
  }
}