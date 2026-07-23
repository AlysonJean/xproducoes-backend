-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'REFERRAL_REWARD';

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "reviewRequestSentAt" TIMESTAMP(3),
ADD COLUMN     "referralRewardIssuedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "referrerClientId" TEXT,
ADD COLUMN     "restrictedToUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "coupons_referrerClientId_key" ON "coupons"("referrerClientId");

-- CreateIndex
CREATE INDEX "coupons_referrerClientId_idx" ON "coupons"("referrerClientId");

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_referrerClientId_fkey" FOREIGN KEY ("referrerClientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
