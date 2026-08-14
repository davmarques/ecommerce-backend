import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthTokenPayload } from '../auth/auth.types';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(@Headers('x-store-domain') storeDomain?: string) {
    return this.productsService.findAll(storeDomain);
  }

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string, @Headers('x-store-domain') storeDomain?: string) {
    return this.productsService.findBySlug(slug, storeDomain);
  }

  @UseGuards(AuthGuard)
  @Post()
  async create(@CurrentUser() user: AuthTokenPayload, @Body() payload: ProductPayload) {
    return this.productsService.create(user, payload);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  async update(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() payload: ProductPayload,
  ) {
    return this.productsService.update(user, id, payload);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  async remove(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.productsService.remove(user, id);
  }
}

interface ProductPayload {
  name?: string;
  slug?: string;
  description?: string;
  price?: number;
  weight?: number;
  height?: number;
  width?: number;
  length?: number;
  categoryId?: string;
  isFeatured?: boolean;
  variants?: Array<{ id?: string; size?: string; sku?: string; stock?: number }>;
}
