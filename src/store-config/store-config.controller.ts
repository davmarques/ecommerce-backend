import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthTokenPayload } from '../auth/auth.types';
import { StoreConfigService } from './store-config.service';
import type { UpdateIntegrationSettingsDto } from './store-config.types';

@Controller('store-config')
@UseGuards(AuthGuard)
export class StoreConfigController {
  constructor(private readonly storeConfigService: StoreConfigService) {}

  @Get('integrations')
  async findIntegrationSettings(@CurrentUser() user: AuthTokenPayload) {
    return this.storeConfigService.getIntegrationSettings(user);
  }

  @Patch('integrations')
  async updateIntegrationSettings(
    @CurrentUser() user: AuthTokenPayload,
    @Body() body: UpdateIntegrationSettingsDto,
  ) {
    return this.storeConfigService.updateIntegrationSettings(user, body);
  }
}
