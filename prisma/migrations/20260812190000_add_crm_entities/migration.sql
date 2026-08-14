-- CreateEnum
CREATE TYPE "CrmDealStage" AS ENUM ('LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON');

-- CreateEnum
CREATE TYPE "CrmTaskType" AS ENUM ('CALL', 'EMAIL', 'MEETING', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "CrmTaskPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "CrmActivityKind" AS ENUM ('DEAL', 'TASK', 'CONTACT', 'NOTE');

-- CreateTable
CREATE TABLE "CrmDeal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "stage" "CrmDealStage" NOT NULL DEFAULT 'LEAD',
    "probability" INTEGER NOT NULL DEFAULT 25,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmDeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "CrmTaskType" NOT NULL,
    "priority" "CrmTaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueLabel" TEXT NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "assigneeName" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "productId" TEXT,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmActivity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "kind" "CrmActivityKind" NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CrmDeal_productId_key" ON "CrmDeal"("productId");

-- CreateIndex
CREATE INDEX "CrmDeal_tenantId_idx" ON "CrmDeal"("tenantId");

-- CreateIndex
CREATE INDEX "CrmTask_tenantId_idx" ON "CrmTask"("tenantId");

-- CreateIndex
CREATE INDEX "CrmActivity_tenantId_idx" ON "CrmActivity"("tenantId");

-- AddForeignKey
ALTER TABLE "CrmDeal" ADD CONSTRAINT "CrmDeal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "StoreConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmDeal" ADD CONSTRAINT "CrmDeal_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTask" ADD CONSTRAINT "CrmTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "StoreConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTask" ADD CONSTRAINT "CrmTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTask" ADD CONSTRAINT "CrmTask_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTask" ADD CONSTRAINT "CrmTask_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "StoreConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enable RLS
ALTER TABLE "CrmDeal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CrmTask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CrmActivity" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "CrmDeal" FORCE ROW LEVEL SECURITY;
ALTER TABLE "CrmTask" FORCE ROW LEVEL SECURITY;
ALTER TABLE "CrmActivity" FORCE ROW LEVEL SECURITY;

CREATE POLICY crm_deal_tenant_isolation ON "CrmDeal"
  USING ("tenantId" = current_setting('app.current_store_id', true))
  WITH CHECK ("tenantId" = current_setting('app.current_store_id', true));

CREATE POLICY crm_task_tenant_isolation ON "CrmTask"
  USING ("tenantId" = current_setting('app.current_store_id', true))
  WITH CHECK ("tenantId" = current_setting('app.current_store_id', true));

CREATE POLICY crm_activity_tenant_isolation ON "CrmActivity"
  USING ("tenantId" = current_setting('app.current_store_id', true))
  WITH CHECK ("tenantId" = current_setting('app.current_store_id', true));
