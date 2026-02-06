/*
  Warnings:

  - You are about to drop the column `isAvailable` on the `equipments` table. All the data in the column will be lost.
  - You are about to drop the column `isAvailable` on the `kits` table. All the data in the column will be lost.
  - You are about to drop the `_KitEquipments` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[clientId,kitId]` on the table `client_favorites` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[clientId,serviceId]` on the table `client_favorites` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `portfolios` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `reviews` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'COMING_SOON');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "SocialPostStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "_KitEquipments" DROP CONSTRAINT "_KitEquipments_A_fkey";

-- DropForeignKey
ALTER TABLE "_KitEquipments" DROP CONSTRAINT "_KitEquipments_B_fkey";

-- AlterTable
ALTER TABLE "client_favorites" ADD COLUMN     "kitId" TEXT,
ADD COLUMN     "serviceId" TEXT,
ALTER COLUMN "equipmentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "equipments" DROP COLUMN "isAvailable",
ADD COLUMN     "status" "ItemStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "kits" DROP COLUMN "isAvailable",
ADD COLUMN     "status" "ItemStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "portfolios" ADD COLUMN     "coverImage" TEXT,
ADD COLUMN     "slug" TEXT;

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "slug" TEXT;

-- DropTable
DROP TABLE "_KitEquipments";

-- CreateTable
CREATE TABLE "portfolio_media" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "MediaType" NOT NULL DEFAULT 'IMAGE',
    "filename" TEXT,
    "mimeType" TEXT,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "description" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "status" "ItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "imageUrl" TEXT,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kit_items" (
    "id" TEXT NOT NULL,
    "kitId" TEXT NOT NULL,
    "equipmentId" TEXT,
    "serviceId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "kit_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kit_experience_levels" (
    "id" TEXT NOT NULL,
    "level" "ExperienceLevel" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "includes" TEXT[],
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "kitId" TEXT NOT NULL,

    CONSTRAINT "kit_experience_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_credentials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'INSTAGRAM',
    "accessToken" TEXT NOT NULL,
    "pageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_social_settings" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "name" TEXT,
    "slug" TEXT,
    "hashtag" TEXT NOT NULL,
    "autoApprove" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_social_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_posts" (
    "id" TEXT NOT NULL,
    "settingId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "permalink" TEXT NOT NULL,
    "caption" TEXT,
    "author" TEXT NOT NULL,
    "status" "SocialPostStatus" NOT NULL DEFAULT 'PENDING',
    "postedAt" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tv_devices" (
    "id" TEXT NOT NULL,
    "pairingCode" TEXT NOT NULL,
    "deviceToken" TEXT NOT NULL,
    "name" TEXT,
    "settingId" TEXT,
    "bookingId" TEXT,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tv_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "portfolio_media_portfolioId_idx" ON "portfolio_media"("portfolioId");

-- CreateIndex
CREATE UNIQUE INDEX "services_slug_key" ON "services"("slug");

-- CreateIndex
CREATE INDEX "kit_items_kitId_idx" ON "kit_items"("kitId");

-- CreateIndex
CREATE INDEX "kit_items_equipmentId_idx" ON "kit_items"("equipmentId");

-- CreateIndex
CREATE INDEX "kit_items_serviceId_idx" ON "kit_items"("serviceId");

-- CreateIndex
CREATE INDEX "kit_experience_levels_kitId_idx" ON "kit_experience_levels"("kitId");

-- CreateIndex
CREATE INDEX "kit_experience_levels_level_idx" ON "kit_experience_levels"("level");

-- CreateIndex
CREATE UNIQUE INDEX "kit_experience_levels_kitId_level_key" ON "kit_experience_levels"("kitId", "level");

-- CreateIndex
CREATE INDEX "social_credentials_userId_idx" ON "social_credentials"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "event_social_settings_bookingId_key" ON "event_social_settings"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "event_social_settings_slug_key" ON "event_social_settings"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "social_posts_platformId_key" ON "social_posts"("platformId");

-- CreateIndex
CREATE INDEX "social_posts_settingId_idx" ON "social_posts"("settingId");

-- CreateIndex
CREATE INDEX "social_posts_status_idx" ON "social_posts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tv_devices_pairingCode_key" ON "tv_devices"("pairingCode");

-- CreateIndex
CREATE UNIQUE INDEX "tv_devices_deviceToken_key" ON "tv_devices"("deviceToken");

-- CreateIndex
CREATE INDEX "tv_devices_pairingCode_idx" ON "tv_devices"("pairingCode");

-- CreateIndex
CREATE INDEX "tv_devices_settingId_idx" ON "tv_devices"("settingId");

-- CreateIndex
CREATE UNIQUE INDEX "client_favorites_clientId_kitId_key" ON "client_favorites"("clientId", "kitId");

-- CreateIndex
CREATE UNIQUE INDEX "client_favorites_clientId_serviceId_key" ON "client_favorites"("clientId", "serviceId");

-- CreateIndex
CREATE INDEX "equipments_status_idx" ON "equipments"("status");

-- CreateIndex
CREATE INDEX "kits_status_idx" ON "kits"("status");

-- CreateIndex
CREATE UNIQUE INDEX "portfolios_slug_key" ON "portfolios"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_slug_key" ON "reviews"("slug");

-- AddForeignKey
ALTER TABLE "portfolio_media" ADD CONSTRAINT "portfolio_media_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_favorites" ADD CONSTRAINT "client_favorites_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "kits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_favorites" ADD CONSTRAINT "client_favorites_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kit_items" ADD CONSTRAINT "kit_items_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "kits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kit_items" ADD CONSTRAINT "kit_items_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kit_items" ADD CONSTRAINT "kit_items_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kit_experience_levels" ADD CONSTRAINT "kit_experience_levels_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "kits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_credentials" ADD CONSTRAINT "social_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_social_settings" ADD CONSTRAINT "event_social_settings_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_settingId_fkey" FOREIGN KEY ("settingId") REFERENCES "event_social_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tv_devices" ADD CONSTRAINT "tv_devices_settingId_fkey" FOREIGN KEY ("settingId") REFERENCES "event_social_settings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tv_devices" ADD CONSTRAINT "tv_devices_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
