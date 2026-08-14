import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthTokenPayload } from '../auth/auth.types';
import { CategoriesService } from './categories.service';

interface CategoryPayload {
  name?: string;
  slug?: string;
}

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findAll(@Headers('x-store-domain') storeDomain?: string) {
    return this.categoriesService.findAll(storeDomain);
  }

  @UseGuards(AuthGuard)
  @Post()
  async create(@CurrentUser() user: AuthTokenPayload, @Body() payload: CategoryPayload) {
    return this.categoriesService.create(user, payload);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  async update(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() payload: CategoryPayload,
  ) {
    return this.categoriesService.update(user, id, payload);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  async remove(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.categoriesService.remove(user, id);
  }
}
