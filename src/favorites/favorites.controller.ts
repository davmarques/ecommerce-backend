import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthTokenPayload } from '../auth/auth.types';
import { FavoritesService } from './favorites.service';

@Controller('favorites')
@UseGuards(AuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  async findAll(@CurrentUser() user: AuthTokenPayload) {
    return this.favoritesService.findAll(user);
  }

  @Post(':productId')
  async add(@CurrentUser() user: AuthTokenPayload, @Param('productId') productId: string) {
    return this.favoritesService.add(user, productId);
  }

  @Delete(':productId')
  async remove(@CurrentUser() user: AuthTokenPayload, @Param('productId') productId: string) {
    return this.favoritesService.remove(user, productId);
  }
}