import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthTokenPayload } from '../auth/auth.types';
import { TenancyService } from '../tenancy/tenancy.service';

const productInclude = {
  images: true,
  variants: true,
  category: true,
} as const;

@Injectable()
export class FavoritesService {
  constructor(private readonly tenancyService: TenancyService) {}

  async findAll(user: AuthTokenPayload) {
    const favorites = await this.tenancyService.withTenant(user.tenantId, (tx) =>
      tx.favorite.findMany({
        where: { userId: user.sub },
        include: { product: { include: productInclude } },
        orderBy: { createdAt: 'desc' },
      }),
    );

    return favorites.map((favorite) => favorite.product);
  }

  async add(user: AuthTokenPayload, productId: string) {
    return this.tenancyService.withTenant(user.tenantId, async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, tenantId: user.tenantId },
        include: productInclude,
      });

      if (!product) {
        throw new NotFoundException('Produto nao encontrado.');
      }

      await tx.favorite.upsert({
        where: { userId_productId: { userId: user.sub, productId } },
        update: {},
        create: { userId: user.sub, productId, tenantId: user.tenantId },
      });

      return product;
    });
  }

  async remove(user: AuthTokenPayload, productId: string) {
    await this.tenancyService.withTenant(user.tenantId, (tx) =>
      tx.favorite.deleteMany({ where: { userId: user.sub, productId, tenantId: user.tenantId } }),
    );

    return { success: true };
  }
}