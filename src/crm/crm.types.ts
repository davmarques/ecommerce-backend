import { CrmDealStage, CrmTaskPriority, CrmTaskType } from '@prisma/client';

export interface UpdateDealStageDto {
  stage: CrmDealStage;
}

export interface CreateTaskDto {
  title: string;
  type: CrmTaskType;
  priority?: CrmTaskPriority;
  dueLabel: string;
  assigneeName?: string;
  productId?: string;
  categoryId?: string;
}
