import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthTokenPayload } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';

interface ProductVariantPayload {
  id?: string;
  size?: string;
  sku?: string;
  stock?: number;
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
  variants?: ProductVariantPayload[];
}

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private tenancyService: TenancyService,
  ) {}

  async findAll(storeDomain?: string) {
    const tenant = await this.tenancyService.resolveTenant(storeDomain);

    return this.tenancyService.withTenant(tenant.id, (tx) =>
      tx.product.findMany({
        where: { tenantId: tenant.id },
        include: {
          images: true,
          variants: true,
          category: true,
        },
      }),
    );
  }

  async findBySlug(slug: string, storeDomain?: string) {
    const tenant = await this.tenancyService.resolveTenant(storeDomain);
    const product = await this.tenancyService.withTenant(tenant.id, (tx) =>
      tx.product.findFirst({
        where: {
          slug,
          tenantId: tenant.id,
        },
        include: {
          images: true,
          variants: true,
          category: true,
        },
      }),
    );

    if (!product) {
      throw new NotFoundException('Produto nao encontrado');
    }

    return product;
  }

  async create(user: AuthTokenPayload, payload: ProductPayload) {
    const values = this.normalizePayload(payload);

    return this.tenancyService.withTenant(user.tenantId, async (tx) => {
      await this.assertCategory(tx, values.categoryId, user.tenantId);

      return tx.product.create({
        data: {
          tenantId: user.tenantId,
          name: values.name,
          slug: values.slug,
          description: values.description,
          price: values.price,
          weight: values.weight,
          height: values.height,
          width: values.width,
          length: values.length,
          categoryId: values.categoryId,
          isFeatured: values.isFeatured,
          variants: {
            create: values.variants.map(({ size, sku, stock }) => ({ size, sku, stock })),
          },
        },
        include: { images: true, variants: true, category: true },
      });
    });
  }

  async update(user: AuthTokenPayload, id: string, payload: ProductPayload) {
    const values = this.normalizePayload(payload);

    return this.tenancyService.withTenant(user.tenantId, async (tx) => {
      const product = await tx.product.findFirst({ where: { id, tenantId: user.tenantId }, include: { variants: true } });

      if (!product) {
        throw new NotFoundException('Produto nao encontrado.');
      }

      await this.assertCategory(tx, values.categoryId, user.tenantId);

      const updated = await tx.product.update({
        where: { id: product.id },
        data: {
          name: values.name,
          slug: values.slug,
          description: values.description,
          price: values.price,
          weight: values.weight,
          height: values.height,
          width: values.width,
          length: values.length,
          categoryId: values.categoryId,
          isFeatured: values.isFeatured,
        },
      });

      const keptIds = values.variants.map((item) => item.id).filter(Boolean) as string[];
      const removed = product.variants.filter((item) => !keptIds.includes(item.id));

      if (removed.length) {
        const sold = await tx.orderItem.count({ where: { variantId: { in: removed.map((item) => item.id) } } });
        if (sold > 0) {
          throw new BadRequestException('Nao e possivel remover tamanhos ja vendidos.');
        }
        await tx.productVariant.deleteMany({ where: { id: { in: removed.map((item) => item.id) } } });
      }

      for (const item of values.variants) {
        const existing = item.id && product.variants.find((variant) => variant.id === item.id);
        if (existing) {
          await tx.productVariant.update({
            where: { id: existing.id },
            data: { size: item.size, sku: item.sku, stock: item.stock },
          });
        } else {
          await tx.productVariant.create({
            data: { productId: product.id, size: item.size, sku: item.sku, stock: item.stock },
          });
        }
      }

      return tx.product.findUniqueOrThrow({
        where: { id: updated.id },
        include: { images: true, variants: true, category: true },
      });
    });
  }

  async remove(user: AuthTokenPayload, id: string) {
    return this.tenancyService.withTenant(user.tenantId, async (tx) => {
      const product = await tx.product.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });

      if (!product) {
        throw new NotFoundException('Produto nao encontrado.');
      }

      await tx.product.delete({ where: { id: product.id } });
      return { id: product.id };
    });
  }

  private normalizePayload(payload: ProductPayload) {
    const name = payload.name?.trim();
    const slug = payload.slug?.trim().toLowerCase();
    const description = payload.description?.trim();
    const categoryId = payload.categoryId?.trim();
    const price = Number(payload.price);
    const weight = Number(payload.weight);
    const height = Number(payload.height);
    const width = Number(payload.width);
    const length = Number(payload.length);

    if (!name || !slug || !description || !categoryId || [price, weight, height, width, length].some((value) => !Number.isFinite(value) || value < 0)) {
      throw new BadRequestException('Preencha corretamente todos os campos do produto.');
    }

    return {
      name,
      slug,
      description,
      categoryId,
      price,
      weight,
      height: Math.round(height),
      width: Math.round(width),
      length: Math.round(length),
      isFeatured: Boolean(payload.isFeatured),
      variants: this.normalizeVariants(payload.variants),
    };
  }

  private normalizeVariants(variants?: ProductVariantPayload[]) {
    if (!Array.isArray(variants) || variants.length === 0) {
      throw new BadRequestException('Informe ao menos um tamanho para o produto.');
    }

    const normalized = variants.map((variant) => {
      const size = variant.size?.trim();
      const sku = variant.sku?.trim();
      const stock = Number(variant.stock);

      if (!size || !sku || !Number.isFinite(stock) || stock < 0) {
        throw new BadRequestException('Preencha tamanho, SKU e estoque de cada variacao.');
      }

      return { id: variant.id?.trim() || undefined, size, sku, stock: Math.round(stock) };
    });

    const sizes = normalized.map((variant) => variant.size.toLowerCase());
    if (new Set(sizes).size !== sizes.length) {
      throw new BadRequestException('Tamanhos duplicados no mesmo produto.');
    }

    return normalized;
  }

  private async assertCategory(
    tx: Parameters<Parameters<TenancyService['withTenant']>[1]>[0],
    categoryId: string,
    tenantId: string,
  ) {
    const category = await tx.category.findFirst({ where: { id: categoryId, tenantId }, select: { id: true } });

    if (!category) {
      throw new BadRequestException('Categoria nao pertence ao tenant atual.');
    }
  }
}
