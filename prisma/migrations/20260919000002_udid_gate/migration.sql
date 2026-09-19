CREATE TABLE "device_enrollments" (
  "id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "uid_hash" TEXT,
  "uid_display" TEXT,
  "source" TEXT NOT NULL DEFAULT 'udid_profile',
  "verified_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "device_enrollments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "device_enrollments_token_hash_key" ON "device_enrollments"("token_hash");
CREATE INDEX "device_enrollments_uid_hash_expires_at_idx" ON "device_enrollments"("uid_hash", "expires_at");
