-- AlterTable
ALTER TABLE "public"."bookings" ADD COLUMN     "paymentProofUrl" TEXT,
ADD COLUMN     "serviceValue" DECIMAL(10,2);
