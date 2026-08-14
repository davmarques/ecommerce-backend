import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenancyService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveTenant(domain?: string) {
    const normalizedDomain = this.normalizeDomain(domain);
    const tenantSelector = {
      id: true,
      domain: true,
    } as const;

    const store = normalizedDomain
      ? await this.prisma.storeConfig.findFirst({
          where: { domain: normalizedDomain },
          select: tenantSelector,
        })
      : await this.prisma.storeConfig.findFirst({
          orderBy: { createdAt: 'asc' },
          select: tenantSelector,
        });

    if (!store) {
      throw new ServiceUnavailableException('Nenhuma loja configurada para autenticar este usuario.');
    }

    return store;
  }

  async withTenant<T>(tenantId: string, callback: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_store_id', ${tenantId}, true)`;
      return callback(tx);
    });
  }

  private normalizeDomain(domain?: string) {
    if (!domain) {
      return undefined;
    }

    return domain
      .replace(/^https?:\/\//i, '')
      .split('/')[0]
      .trim()
      .toLowerCase();
  }
}