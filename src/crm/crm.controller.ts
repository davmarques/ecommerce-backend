import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CrmDealStage } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthTokenPayload } from '../auth/auth.types';
import { CrmService } from './crm.service';
import type { CreateTaskDto } from './crm.types';

@Controller('crm')
@UseGuards(AuthGuard)
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get('contacts')
  async getContacts(@CurrentUser() user: AuthTokenPayload) {
    return this.crmService.getContacts(user);
  }

  @Get('contacts/:contactId')
  async getContact(@CurrentUser() user: AuthTokenPayload, @Param('contactId') contactId: string) {
    return this.crmService.getContact(user, contactId);
  }

  @Get('deals')
  async getDeals(@CurrentUser() user: AuthTokenPayload) {
    return this.crmService.getDeals(user);
  }

  @Patch('deals/:productId/stage')
  async updateDealStage(
    @CurrentUser() user: AuthTokenPayload,
    @Param('productId') productId: string,
    @Body() body: { stage?: CrmDealStage },
  ) {
    return this.crmService.updateDealStage(user, productId, body?.stage);
  }

  @Get('tasks')
  async getTasks(@CurrentUser() user: AuthTokenPayload) {
    return this.crmService.getTasks(user);
  }

  @Post('tasks')
  async createTask(@CurrentUser() user: AuthTokenPayload, @Body() payload: CreateTaskDto) {
    return this.crmService.createTask(user, payload);
  }

  @Patch('tasks/:taskId/toggle')
  async toggleTask(@CurrentUser() user: AuthTokenPayload, @Param('taskId') taskId: string) {
    return this.crmService.toggleTask(user, taskId);
  }

  @Get('activities')
  async getActivities(@CurrentUser() user: AuthTokenPayload) {
    return this.crmService.getActivities(user);
  }
}
