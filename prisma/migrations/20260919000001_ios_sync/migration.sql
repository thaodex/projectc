ALTER TABLE "license_keys" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "devices" ADD COLUMN "apns_token" TEXT;
ALTER TABLE "devices" ADD COLUMN "apns_updated_at" TIMESTAMP(3);
CREATE UNIQUE INDEX "devices_apns_token_key" ON "devices"("apns_token");

CREATE TABLE "device_commands" (
  "id" TEXT NOT NULL,
  "key_id" TEXT NOT NULL,
  "device_id" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "payload" JSONB,
  "delivered_at" TIMESTAMP(3),
  "acknowledged_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "device_commands_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "device_commands_device_id_acknowledged_at_revision_idx" ON "device_commands"("device_id", "acknowledged_at", "revision");
ALTER TABLE "device_commands" ADD CONSTRAINT "device_commands_key_id_fkey" FOREIGN KEY ("key_id") REFERENCES "license_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "device_commands" ADD CONSTRAINT "device_commands_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
