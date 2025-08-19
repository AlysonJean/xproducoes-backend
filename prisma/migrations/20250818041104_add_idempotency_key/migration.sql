/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `bookings` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."idx_users_email_verification_token";

-- AlterTable
ALTER TABLE "public"."bookings" ADD COLUMN     "idempotencyKey" TEXT;

-- AlterTable
ALTER TABLE "public"."users" ALTER COLUMN "emailVerificationTokenExpiry" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."PortfolioItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bookings_idempotencyKey_key" ON "public"."bookings"("idempotencyKey");
