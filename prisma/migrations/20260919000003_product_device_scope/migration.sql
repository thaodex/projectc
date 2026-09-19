ALTER TABLE "devices" ADD COLUMN "product_id" TEXT;
UPDATE "devices" AS d SET "product_id" = k."product_id" FROM "license_keys" AS k WHERE d."key_id" = k."id";
ALTER TABLE "devices" ALTER COLUMN "product_id" SET NOT NULL;
DROP INDEX "devices_uid_hash_key";
CREATE UNIQUE INDEX "devices_product_id_uid_hash_key" ON "devices"("product_id", "uid_hash");
ALTER TABLE "devices" ADD CONSTRAINT "devices_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "products" ADD COLUMN "bundle_id" TEXT;
CREATE UNIQUE INDEX "products_bundle_id_key" ON "products"("bundle_id");
