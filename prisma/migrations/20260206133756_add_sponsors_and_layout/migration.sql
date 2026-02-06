-- CreateEnum
CREATE TYPE "LayoutMode" AS ENUM ('LANDSCAPE', 'PORTRAIT');

-- AlterTable
ALTER TABLE "event_social_settings" ADD COLUMN     "layoutMode" "LayoutMode" NOT NULL DEFAULT 'LANDSCAPE';

-- CreateTable
CREATE TABLE "sponsor_logos" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "sponsor_logos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EventSocialSettingToSponsorLogo" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "sponsor_logos_userId_idx" ON "sponsor_logos"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "_EventSocialSettingToSponsorLogo_AB_unique" ON "_EventSocialSettingToSponsorLogo"("A", "B");

-- CreateIndex
CREATE INDEX "_EventSocialSettingToSponsorLogo_B_index" ON "_EventSocialSettingToSponsorLogo"("B");

-- AddForeignKey
ALTER TABLE "sponsor_logos" ADD CONSTRAINT "sponsor_logos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventSocialSettingToSponsorLogo" ADD CONSTRAINT "_EventSocialSettingToSponsorLogo_A_fkey" FOREIGN KEY ("A") REFERENCES "event_social_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventSocialSettingToSponsorLogo" ADD CONSTRAINT "_EventSocialSettingToSponsorLogo_B_fkey" FOREIGN KEY ("B") REFERENCES "sponsor_logos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
