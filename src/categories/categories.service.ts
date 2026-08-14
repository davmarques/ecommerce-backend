import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthTokenPayload } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';

interface CategoryPayload {
  name?: string;
  slug?: string;
}

@Injectable()
export class CategoriesService {
  constructor(
    private prisma: PrismaService,
    private tenancyService: TenancyService,
  ) {}

  async findAll(storeDomain?: string) {
    const tenant = await this.tenancyService.resolveTenant(storeDomain);

    return this.tenancyService.withTenant(tenant.id, (tx) =>
      tx.category.findMany({
        where: { tenantId: tenant.id },
        include: {
          _count: {
            select: { products: true },
          },
        },
      }),
    );
  }

  async create(user: AuthTokenPayload, payload: CategoryPayload) {
    this.assertAdmin(user);
    const values = this.normalizePayload(payload);

    return this.tenancyService.withTenant(user.tenantId, async (tx) => {
      await this.assertSlugAvailable(tx, values.slug, user.tenantId);

      return tx.category.create({
        data: { tenantId: user.tenantId, name: values.name, slug: values.slug },
        include: { _count: { select: { products: true } } },
      });
    });
  }

  async update(user: AuthTokenPayload, id: string, payload: CategoryPayload) {
    this.assertAdmin(user);
    const values = this.normalizePayload(payload);

    return this.tenancyService.withTenant(user.tenantId, async (tx) => {
      const category = await tx.category.findFirst({
        where: { id, tenantId: user.tenantId },
        select: { id: true },
      });

      if (!category) {
        throw new NotFoundException('Categoria nao encontrada.');
      }

      await this.assertSlugAvailable(tx, values.slug, user.tenantId, category.id);

      return tx.category.update({
        where: { id: category.id },
        data: { name: values.name, slug: values.slug },
        include: { _count: { select: { products: true } } },
      });
    });
  }

  async remove(user: AuthTokenPayload, id: string) {
    this.assertAdmin(user);

    return this.tenancyService.withTenant(user.tenantId, async (tx) => {
      const category = await tx.category.findFirst({
        where: { id, tenantId: user.tenantId },
        select: { id: true, _count: { select: { products: true } } },
      });

      if (!category) {
        throw new NotFoundException('Categoria nao encontrada.');
      }

      if (category._count.products > 0) {
        throw new BadRequestException('Categoria possui produtos vinculados.');
      }

      await tx.category.delete({ where: { id: category.id } });
      return { id: category.id };
    });
  }

  private assertAdmin(user: AuthTokenPayload) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
      throw new ForbiddenException('Apenas administradores podem gerenciar categorias.');
    }
  }

  private normalizePayload(payload: CategoryPayload) {
    const name = payload.name?.trim();
    const slug = slugify(payload.slug?.trim() || name || '');

    if (!name || !slug) {
      throw new BadRequestException('Informe um nome valido para a categoria.');
    }

    return { name, slug };
  }

  private async assertSlugAvailable(
    tx: Parameters<Parameters<TenancyService['withTenant']>[1]>[0],
    slug: string,
    tenantId: string,
    ignoreId?: string,
  ) {
    const existing = await tx.category.findFirst({
      where: { slug, tenantId, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('Ja existe uma categoria com esse nome.');
    }
  }
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
