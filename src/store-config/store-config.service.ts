import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { AuthTokenPayload } from '../auth/auth.types';
import { TenancyService } from '../tenancy/tenancy.service';
import { IntegrationSettingsResponse, UpdateIntegrationSettingsDto } from './store-config.types';

type NullableIntegrationField =
  | 'originStreet'
  | 'originNumber'
  | 'originDistrict'
  | 'originCity'
  | 'originState'
  | 'originCountry'
  | 'melhorEnvioToken'
  | 'mercadoPagoAccessToken'
  | 'mercadoPagoPublicKey'
  | 'mercadoPagoWebhookUrl'
  | 'mercadoPagoWebhookSecret';

type RequiredIntegrationField = 'supportEmail' | 'originZip';

@Injectable()
export class StoreConfigService {
  constructor(private readonly tenancyService: TenancyService) {}

  async getIntegrationSettings(user: AuthTokenPayload): Promise<IntegrationSettingsResponse> {
    this.assertCanManageIntegrations(user.role);

    const store = await this.tenancyService.withTenant(user.tenantId, (tx) =>
      tx.storeConfig.findUnique({
        where: { id: user.tenantId },
      }),
    );

    if (!store) {
      throw new NotFoundException('Configuracao da loja nao encontrada.');
    }

    return {
      supportEmail: store.supportEmail,
      originZip: store.originZip,
      originStreet: store.originStreet,
      originNumber: store.originNumber,
      originDistrict: store.originDistrict,
      originCity: store.originCity,
      originState: store.originState,
      originCountry: store.originCountry,
      mercadoPagoWebhookUrl: store.mercadoPagoWebhookUrl,
      hasMelhorEnvioToken: Boolean(store.melhorEnvioToken),
      hasMercadoPagoAccessToken: Boolean(store.mercadoPagoToken),
      hasMercadoPagoPublicKey: Boolean(store.mercadoPagoPublicKey),
      hasMercadoPagoWebhookSecret: Boolean(store.mercadoPagoWebhookSecret),
    };
  }

  async updateIntegrationSettings(user: AuthTokenPayload, payload: UpdateIntegrationSettingsDto) {
    this.assertCanManageIntegrations(user.role);

    const normalized = this.normalizePayload(payload);

    if (!Object.keys(normalized).length) {
      throw new BadRequestException('Nenhum campo valido foi enviado para atualizacao.');
    }

    if (normalized.supportEmail !== undefined) {
      this.assertValidEmail(normalized.supportEmail);
    }

    if (normalized.originZip !== undefined) {
      this.assertValidZipCode(normalized.originZip);
    }

    if (normalized.mercadoPagoWebhookUrl !== undefined && normalized.mercadoPagoWebhookUrl !== null) {
      this.assertValidHttpUrl(normalized.mercadoPagoWebhookUrl);
    }

    const updated = await this.tenancyService.withTenant(user.tenantId, (tx) =>
      tx.storeConfig.update({
        where: { id: user.tenantId },
        data: {
          supportEmail: normalized.supportEmail,
          originZip: normalized.originZip,
          originStreet: normalized.originStreet,
          originNumber: normalized.originNumber,
          originDistrict: normalized.originDistrict,
          originCity: normalized.originCity,
          originState: normalized.originState,
          originCountry: normalized.originCountry,
          melhorEnvioToken: normalized.melhorEnvioToken,
          mercadoPagoToken: normalized.mercadoPagoAccessToken,
          mercadoPagoPublicKey: normalized.mercadoPagoPublicKey,
          mercadoPagoWebhookUrl: normalized.mercadoPagoWebhookUrl,
          mercadoPagoWebhookSecret: normalized.mercadoPagoWebhookSecret,
        },
      }),
    );

    return {
      supportEmail: updated.supportEmail,
      originZip: updated.originZip,
      originStreet: updated.originStreet,
      originNumber: updated.originNumber,
      originDistrict: updated.originDistrict,
      originCity: updated.originCity,
      originState: updated.originState,
      originCountry: updated.originCountry,
      mercadoPagoWebhookUrl: updated.mercadoPagoWebhookUrl,
      hasMelhorEnvioToken: Boolean(updated.melhorEnvioToken),
      hasMercadoPagoAccessToken: Boolean(updated.mercadoPagoToken),
      hasMercadoPagoPublicKey: Boolean(updated.mercadoPagoPublicKey),
      hasMercadoPagoWebhookSecret: Boolean(updated.mercadoPagoWebhookSecret),
    };
  }

  private assertCanManageIntegrations(role: Role) {
    if (role === Role.CLIENT) {
      throw new ForbiddenException('Apenas administradores podem gerenciar integracoes da loja.');
    }
  }

  private normalizePayload(payload: UpdateIntegrationSettingsDto): UpdateIntegrationSettingsDto {
    const normalized: UpdateIntegrationSettingsDto = {};

    const appendStringField = (key: NullableIntegrationField, value: unknown) => {
      if (value === undefined) {
        return;
      }

      if (value === null) {
        normalized[key] = null;
        return;
      }

      if (typeof value !== 'string') {
        throw new BadRequestException(`Campo ${String(key)} deve ser texto.`);
      }

      const trimmed = value.trim();
      normalized[key] = trimmed.length ? trimmed : null;
    };

    const appendRequiredStringField = (key: RequiredIntegrationField, value: unknown) => {
      if (value === undefined) {
        return;
      }

      if (typeof value !== 'string') {
        throw new BadRequestException(`Campo ${String(key)} deve ser texto.`);
      }

      const trimmed = value.trim();

      if (!trimmed.length) {
        throw new BadRequestException(`Campo ${String(key)} nao pode ser vazio.`);
      }

      normalized[key] = trimmed;
    };

    appendRequiredStringField('supportEmail', payload.supportEmail);
    appendRequiredStringField('originZip', payload.originZip);
    appendStringField('originStreet', payload.originStreet);
    appendStringField('originNumber', payload.originNumber);
    appendStringField('originDistrict', payload.originDistrict);
    appendStringField('originCity', payload.originCity);
    appendStringField('originState', payload.originState);
    appendStringField('originCountry', payload.originCountry);
    appendStringField('melhorEnvioToken', payload.melhorEnvioToken);
    appendStringField('mercadoPagoAccessToken', payload.mercadoPagoAccessToken);
    appendStringField('mercadoPagoPublicKey', payload.mercadoPagoPublicKey);
    appendStringField('mercadoPagoWebhookUrl', payload.mercadoPagoWebhookUrl);
    appendStringField('mercadoPagoWebhookSecret', payload.mercadoPagoWebhookSecret);

    return normalized;
  }

  private assertValidEmail(email: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      throw new BadRequestException('supportEmail invalido.');
    }
  }

  private assertValidZipCode(zip: string) {
    const normalized = zip.replace(/\D/g, '');

    if (normalized.length !== 8) {
      throw new BadRequestException('originZip deve conter 8 digitos.');
    }
  }

  private assertValidHttpUrl(value: string) {
    try {
      const url = new URL(value);

      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new BadRequestException('mercadoPagoWebhookUrl deve usar http ou https.');
      }
    } catch {
      throw new BadRequestException('mercadoPagoWebhookUrl invalida.');
    }
  }
}
