import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CrmActivityKind, CrmDealStage, CrmTaskPriority, CrmTaskType } from '@prisma/client';
import { AuthTokenPayload } from '../auth/auth.types';
import { TenancyService } from '../tenancy/tenancy.service';
import { CreateTaskDto } from './crm.types';

const STAGE_ORDER: CrmDealStage[] = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON'];

const STAGE_PROBABILITY: Record<CrmDealStage, number> = {
  LEAD: 20,
  QUALIFIED: 38,
  PROPOSAL: 56,
  NEGOTIATION: 74,
  WON: 100,
};

const TASK_TYPE_LABEL: Record<CrmTaskType, string> = {
  CALL: 'Ligacao',
  EMAIL: 'Email',
  MEETING: 'Reuniao',
  FOLLOW_UP: 'Follow-up',
};

@Injectable()
export class CrmService {
  constructor(private readonly tenancyService: TenancyService) {}

  async getContacts(user: AuthTokenPayload) {
    return this.tenancyService.withTenant(user.tenantId, (tx) =>
      tx.user.findMany({
        where: { tenantId: user.tenantId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          tenantId: true,
          addresses: {
            select: { city: true, state: true, isDefault: true },
            orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
            take: 1,
          },
        },
        orderBy: { name: 'asc' },
      }),
    );
  }

  async getContact(user: AuthTokenPayload, contactId: string) {
    return this.tenancyService.withTenant(user.tenantId, async (tx) => {
      const contact = await tx.user.findFirst({
        where: { id: contactId, tenantId: user.tenantId },
        select: {
          id: true,
          name: true,
          email: true,
          cpf: true,
          phone: true,
          role: true,
          tenantId: true,
          createdAt: true,
          updatedAt: true,
          addresses: {
            select: {
              id: true,
              zipCode: true,
              street: true,
              number: true,
              complement: true,
              neighborhood: true,
              city: true,
              state: true,
              isDefault: true,
            },
            orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
          },
          orders: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              totalAmount: true,
              customerName: true,
              customerEmail: true,
              customerCpf: true,
              customerPhone: true,
              shippingZip: true,
              shippingAddress: true,
              shippingCity: true,
              shippingState: true,
              shippingService: true,
              shippingCost: true,
              trackingCode: true,
              paymentId: true,
              paymentMethod: true,
              createdAt: true,
              updatedAt: true,
              items: {
                select: {
                  id: true,
                  quantity: true,
                  price: true,
                  variant: {
                    select: {
                      size: true,
                      sku: true,
                      product: { select: { name: true } },
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!contact) {
        throw new NotFoundException('Contato nao encontrado.');
      }

      return contact;
    });
  }

  async getDeals(user: AuthTokenPayload) {
    return this.tenancyService.withTenant(user.tenantId, async (tx) => {
      const [products, existingDeals] = await Promise.all([
        tx.product.findMany({
          where: { tenantId: user.tenantId },
          select: { id: true, name: true, price: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        }),
        tx.crmDeal.findMany({ where: { tenantId: user.tenantId } }),
      ]);

      const dealByProductId = new Map(existingDeals.map((deal) => [deal.productId, deal]));

      return products.map((product) => {
        const existingDeal = dealByProductId.get(product.id);
        const fallbackStage = this.resolveStageByProductId(product.id);
        const stage = existingDeal?.stage || fallbackStage;

        return {
          id: existingDeal?.id || product.id,
          productId: product.id,
          tenantId: user.tenantId,
          title: product.name,
          value: product.price,
          stage,
          probability: existingDeal?.probability ?? STAGE_PROBABILITY[stage],
        };
      });
    });
  }

  async updateDealStage(user: AuthTokenPayload, productId: string, stage?: CrmDealStage) {
    if (!stage || !STAGE_ORDER.includes(stage)) {
      throw new BadRequestException('Estagio invalido para deal.');
    }

    return this.tenancyService.withTenant(user.tenantId, async (tx) => {
      const [product, actorName] = await Promise.all([
        tx.product.findFirst({ where: { id: productId, tenantId: user.tenantId }, select: { id: true, name: true } }),
        this.resolveActorName(tx, user),
      ]);

      if (!product) {
        throw new NotFoundException('Produto nao encontrado para atualizar o deal.');
      }

      const updatedDeal = await tx.crmDeal.upsert({
        where: { productId: product.id },
        update: {
          stage,
          probability: STAGE_PROBABILITY[stage],
        },
        create: {
          tenantId: user.tenantId,
          productId: product.id,
          stage,
          probability: STAGE_PROBABILITY[stage],
        },
      });

      await tx.crmActivity.create({
        data: {
          tenantId: user.tenantId,
          actorId: user.sub,
          actorName,
          kind: CrmActivityKind.DEAL,
          action: 'moveu o deal para',
          target: `${this.formatStageLabel(stage)} (${product.name})`,
        },
      });

      return updatedDeal;
    });
  }

  async getTasks(user: AuthTokenPayload) {
    return this.tenancyService.withTenant(user.tenantId, async (tx) => {
      let tasks = await tx.crmTask.findMany({
        where: { tenantId: user.tenantId },
        orderBy: [{ isDone: 'asc' }, { createdAt: 'desc' }],
      });

      if (tasks.length === 0) {
        const [products, categories, actorName] = await Promise.all([
          tx.product.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true }, take: 3 }),
          tx.category.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true }, take: 2 }),
          this.resolveActorName(tx, user),
        ]);

        for (const [index, product] of products.entries()) {
          await tx.crmTask.create({
            data: {
              tenantId: user.tenantId,
              createdById: user.sub,
              title: `Revisar proposta do produto ${product.name}`,
              type: index % 2 === 0 ? CrmTaskType.FOLLOW_UP : CrmTaskType.MEETING,
              priority: index === 0 ? CrmTaskPriority.HIGH : CrmTaskPriority.MEDIUM,
              dueLabel: `Hoje +${index + 1}h`,
              assigneeName: actorName,
              productId: product.id,
            },
          });
        }

        for (const [index, category] of categories.entries()) {
          await tx.crmTask.create({
            data: {
              tenantId: user.tenantId,
              createdById: user.sub,
              title: `Validar categoria ${category.name}`,
              type: index % 2 === 0 ? CrmTaskType.EMAIL : CrmTaskType.CALL,
              priority: CrmTaskPriority.MEDIUM,
              dueLabel: `Amanha ${9 + index}:00`,
              assigneeName: actorName,
              categoryId: category.id,
            },
          });
        }

        tasks = await tx.crmTask.findMany({
          where: { tenantId: user.tenantId },
          orderBy: [{ isDone: 'asc' }, { createdAt: 'desc' }],
        });
      }

      return tasks;
    });
  }

  async createTask(user: AuthTokenPayload, payload: CreateTaskDto) {
    const title = payload.title?.trim();
    const dueLabel = payload.dueLabel?.trim();

    if (!title || !dueLabel) {
      throw new BadRequestException('Titulo e prazo da tarefa sao obrigatorios.');
    }

    if (!Object.values(CrmTaskType).includes(payload.type)) {
      throw new BadRequestException('Tipo de tarefa invalido.');
    }

    return this.tenancyService.withTenant(user.tenantId, async (tx) => {
      const actorName = await this.resolveActorName(tx, user);
      const [product, category] = await Promise.all([
        payload.productId
          ? tx.product.findFirst({ where: { id: payload.productId, tenantId: user.tenantId }, select: { id: true } })
          : null,
        payload.categoryId
          ? tx.category.findFirst({ where: { id: payload.categoryId, tenantId: user.tenantId }, select: { id: true } })
          : null,
      ]);

      if (payload.productId && !product) {
        throw new BadRequestException('Produto da tarefa nao pertence ao tenant atual.');
      }

      if (payload.categoryId && !category) {
        throw new BadRequestException('Categoria da tarefa nao pertence ao tenant atual.');
      }

      const createdTask = await tx.crmTask.create({
        data: {
          tenantId: user.tenantId,
          createdById: user.sub,
          title,
          type: payload.type,
          priority: payload.priority || CrmTaskPriority.MEDIUM,
          dueLabel,
          assigneeName: payload.assigneeName?.trim() || actorName,
          productId: product?.id,
          categoryId: category?.id,
        },
      });

      await tx.crmActivity.create({
        data: {
          tenantId: user.tenantId,
          actorId: user.sub,
          actorName,
          kind: CrmActivityKind.TASK,
          action: 'criou a tarefa',
          target: createdTask.title,
        },
      });

      return createdTask;
    });
  }

  async toggleTask(user: AuthTokenPayload, taskId: string) {
    return this.tenancyService.withTenant(user.tenantId, async (tx) => {
      const [task, actorName] = await Promise.all([
        tx.crmTask.findFirst({ where: { id: taskId, tenantId: user.tenantId } }),
        this.resolveActorName(tx, user),
      ]);

      if (!task) {
        throw new NotFoundException('Tarefa nao encontrada.');
      }

      const updatedTask = await tx.crmTask.update({
        where: { id: task.id },
        data: { isDone: !task.isDone },
      });

      await tx.crmActivity.create({
        data: {
          tenantId: user.tenantId,
          actorId: user.sub,
          actorName,
          kind: CrmActivityKind.TASK,
          action: updatedTask.isDone ? 'concluiu a tarefa' : 'reabriu a tarefa',
          target: updatedTask.title,
        },
      });

      return updatedTask;
    });
  }

  async getActivities(user: AuthTokenPayload) {
    return this.tenancyService.withTenant(user.tenantId, (tx) =>
      tx.crmActivity.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { createdAt: 'desc' },
        take: 40,
      }),
    );
  }

  private resolveStageByProductId(productId: string): CrmDealStage {
    const checksum = productId.split('').reduce((total, char) => total + char.charCodeAt(0), 0);
    return STAGE_ORDER[checksum % STAGE_ORDER.length];
  }

  private formatStageLabel(stage: CrmDealStage) {
    switch (stage) {
      case 'LEAD':
        return 'Lead';
      case 'QUALIFIED':
        return 'Qualificado';
      case 'PROPOSAL':
        return 'Proposta';
      case 'NEGOTIATION':
        return 'Negociacao';
      case 'WON':
        return 'Ganho';
      default:
        return stage;
    }
  }

  private async resolveActorName(
    tx: Parameters<Parameters<TenancyService['withTenant']>[1]>[0],
    user: AuthTokenPayload,
  ) {
    const actor = await tx.user.findFirst({
      where: { id: user.sub, tenantId: user.tenantId },
      select: { name: true },
    });
    return actor?.name || user.email;
  }
}
