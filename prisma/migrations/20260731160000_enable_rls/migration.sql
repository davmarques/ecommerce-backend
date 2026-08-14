-- 1. HABILITANDO ROW LEVEL SECURITY (RLS) NAS TABELAS
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductVariant" ENABLE ROW LEVEL SECURITY;

-- FORCE RLS garante que até a conexão administrativa do banco respeite a regra
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Category" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Product" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Order" FORCE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ProductVariant" FORCE ROW LEVEL SECURITY;

-- 2. POLÍTICAS DIRETAS (Tabelas que possuem a coluna "tenantId")
CREATE POLICY user_tenant_isolation ON "User"
  USING ("tenantId" = current_setting('app.current_store_id', true))
  WITH CHECK ("tenantId" = current_setting('app.current_store_id', true));

CREATE POLICY category_tenant_isolation ON "Category"
  USING ("tenantId" = current_setting('app.current_store_id', true))
  WITH CHECK ("tenantId" = current_setting('app.current_store_id', true));

CREATE POLICY product_tenant_isolation ON "Product"
  USING ("tenantId" = current_setting('app.current_store_id', true))
  WITH CHECK ("tenantId" = current_setting('app.current_store_id', true));

CREATE POLICY order_tenant_isolation ON "Order"
  USING ("tenantId" = current_setting('app.current_store_id', true))
  WITH CHECK ("tenantId" = current_setting('app.current_store_id', true));

-- 3. POLÍTICAS INDIRETAS (Tabelas filhas sem "tenantId" direto)
CREATE POLICY order_item_tenant_isolation ON "OrderItem"
  USING (
    EXISTS (
      SELECT 1 FROM "Order"
      WHERE "Order".id = "OrderItem"."orderId"
        AND "Order"."tenantId" = current_setting('app.current_store_id', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Order"
      WHERE "Order".id = "OrderItem"."orderId"
        AND "Order"."tenantId" = current_setting('app.current_store_id', true)
    )
  );

CREATE POLICY product_variant_tenant_isolation ON "ProductVariant"
  USING (
    EXISTS (
      SELECT 1 FROM "Product"
      WHERE "Product".id = "ProductVariant"."productId"
        AND "Product"."tenantId" = current_setting('app.current_store_id', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Product"
      WHERE "Product".id = "ProductVariant"."productId"
        AND "Product"."tenantId" = current_setting('app.current_store_id', true)
    )
  );
