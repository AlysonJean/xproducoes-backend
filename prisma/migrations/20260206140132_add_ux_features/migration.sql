-- CreateEnum
CREATE TYPE "AnnouncementType" AS ENUM ('TEXT', 'IMAGE', 'ALERT');

-- AlterTable
ALTER TABLE "event_social_settings" ADD COLUMN     "enableQrCode" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "qrCodeText" TEXT;

-- CreateTable
CREATE TABLE "social_announcements" (
    "id" TEXT NOT NULL,
    "settingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "AnnouncementType" NOT NULL DEFAULT 'TEXT',
    "imageUrl" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 10,
    "frequency" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "social_announcements_settingId_idx" ON "social_announcements"("settingId");

-- AddForeignKey
ALTER TABLE "social_announcements" ADD CONSTRAINT "social_announcements_settingId_fkey" FOREIGN KEY ("settingId") REFERENCES "event_social_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
