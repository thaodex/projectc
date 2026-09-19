CREATE SCHEMA IF NOT EXISTS "public";
CREATE TYPE "UserRole" AS ENUM ('owner', 'admin', 'viewer');
CREATE TYPE "KeyStatus" AS ENUM ('active', 'suspended', 'revoked', 'expired');
CREATE TYPE "DeviceStatus" AS ENUM ('active', 'revoked');
CREATE TYPE "AlertSeverity" AS ENUM ('medium', 'high', 'critical');
CREATE TYPE "AlertStatus" AS ENUM ('open', 'investigating', 'resolved');

CREATE TABLE "users" (
  "id" TEXT NOT NULL, "email" TEXT NOT NULL, "password_hash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'admin', "totp_secret" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "products" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "current_version" TEXT NOT NULL,
  "note" TEXT, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "license_keys" (
  "id" TEXT NOT NULL, "key_code" TEXT NOT NULL, "product_id" TEXT NOT NULL, "owner_name" TEXT NOT NULL,
  "owner_email" TEXT NOT NULL, "max_devices" INTEGER NOT NULL DEFAULT 1, "device_count" INTEGER NOT NULL DEFAULT 0,
  "status" "KeyStatus" NOT NULL DEFAULT 'active', "plan" TEXT NOT NULL, "expires_at" TIMESTAMP(3), "note" TEXT,
  "created_by" TEXT, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "license_keys_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "devices" (
  "id" TEXT NOT NULL, "key_id" TEXT NOT NULL, "uid_hash" TEXT NOT NULL, "uid_display" TEXT NOT NULL,
  "device_name" TEXT NOT NULL, "platform" TEXT NOT NULL, "os_version" TEXT, "app_version" TEXT,
  "ip_first" TEXT, "ip_last" TEXT, "country" TEXT, "status" "DeviceStatus" NOT NULL DEFAULT 'active',
  "activated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "audit_logs" (
  "id" TEXT NOT NULL, "actor_id" TEXT, "action" TEXT NOT NULL, "key_id" TEXT, "device_id" TEXT,
  "ip" TEXT, "user_agent" TEXT, "payload" JSONB, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "api_nonces" (
  "id" TEXT NOT NULL, "value" TEXT NOT NULL, "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "api_nonces_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "security_alerts" (
  "id" TEXT NOT NULL, "key_id" TEXT NOT NULL, "severity" "AlertSeverity" NOT NULL, "title" TEXT NOT NULL,
  "detail" TEXT NOT NULL, "signals" JSONB NOT NULL, "status" "AlertStatus" NOT NULL DEFAULT 'open',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "security_alerts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");
CREATE UNIQUE INDEX "license_keys_key_code_key" ON "license_keys"("key_code");
CREATE INDEX "license_keys_status_idx" ON "license_keys"("status");
CREATE UNIQUE INDEX "devices_uid_hash_key" ON "devices"("uid_hash");
CREATE INDEX "devices_key_id_last_seen_at_idx" ON "devices"("key_id", "last_seen_at");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");
CREATE UNIQUE INDEX "api_nonces_value_key" ON "api_nonces"("value");
CREATE INDEX "api_nonces_expires_at_idx" ON "api_nonces"("expires_at");
CREATE INDEX "security_alerts_key_id_status_idx" ON "security_alerts"("key_id", "status");
ALTER TABLE "license_keys" ADD CONSTRAINT "license_keys_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "license_keys" ADD CONSTRAINT "license_keys_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "devices" ADD CONSTRAINT "devices_key_id_fkey" FOREIGN KEY ("key_id") REFERENCES "license_keys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_key_id_fkey" FOREIGN KEY ("key_id") REFERENCES "license_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "security_alerts" ADD CONSTRAINT "security_alerts_key_id_fkey" FOREIGN KEY ("key_id") REFERENCES "license_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
