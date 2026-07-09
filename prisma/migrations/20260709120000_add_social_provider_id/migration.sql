-- AlterTable
ALTER TABLE "users" ADD COLUMN "socialProviderId" TEXT;

-- CreateIndex
CREATE INDEX "users_socialProvider_socialProviderId_idx" ON "users"("socialProvider", "socialProviderId");
