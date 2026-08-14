ALTER TABLE "StoreConfig"
ADD COLUMN "originStreet" TEXT,
ADD COLUMN "originNumber" TEXT,
ADD COLUMN "originDistrict" TEXT,
ADD COLUMN "originCity" TEXT,
ADD COLUMN "originState" TEXT,
ADD COLUMN "originCountry" TEXT DEFAULT 'BR',
ADD COLUMN "mercadoPagoPublicKey" TEXT,
ADD COLUMN "mercadoPagoWebhookUrl" TEXT,
ADD COLUMN "mercadoPagoWebhookSecret" TEXT;
