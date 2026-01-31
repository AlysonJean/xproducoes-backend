/*
  Warnings:

  - The primary key for the `_BookingEquipments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `_KitEquipments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the `Portfolio` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PortfolioItem` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[A,B]` on the table `_BookingEquipments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[A,B]` on the table `_KitEquipments` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "_BookingEquipments" DROP CONSTRAINT "_BookingEquipments_AB_pkey";

-- AlterTable
ALTER TABLE "_KitEquipments" DROP CONSTRAINT "_KitEquipments_AB_pkey";

-- DropTable
DROP TABLE "Portfolio";

-- DropTable
DROP TABLE "PortfolioItem";

-- CreateTable
CREATE TABLE "newsletter_subscribers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolios" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscribers_email_key" ON "newsletter_subscribers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "_BookingEquipments_AB_unique" ON "_BookingEquipments"("A", "B");

-- CreateIndex
CREATE UNIQUE INDEX "_KitEquipments_AB_unique" ON "_KitEquipments"("A", "B");
