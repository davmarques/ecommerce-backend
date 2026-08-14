export interface UpdateIntegrationSettingsDto {
  supportEmail?: string;
  originZip?: string;
  originStreet?: string | null;
  originNumber?: string | null;
  originDistrict?: string | null;
  originCity?: string | null;
  originState?: string | null;
  originCountry?: string | null;
  melhorEnvioToken?: string | null;
  mercadoPagoAccessToken?: string | null;
  mercadoPagoPublicKey?: string | null;
  mercadoPagoWebhookUrl?: string | null;
  mercadoPagoWebhookSecret?: string | null;
}

export interface IntegrationSettingsResponse {
  supportEmail: string;
  originZip: string;
  originStreet: string | null;
  originNumber: string | null;
  originDistrict: string | null;
  originCity: string | null;
  originState: string | null;
  originCountry: string | null;
  mercadoPagoWebhookUrl: string | null;
  hasMelhorEnvioToken: boolean;
  hasMercadoPagoAccessToken: boolean;
  hasMercadoPagoPublicKey: boolean;
  hasMercadoPagoWebhookSecret: boolean;
}
