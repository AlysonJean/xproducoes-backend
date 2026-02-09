-- AlterTable
ALTER TABLE "_BookingEquipments" ADD CONSTRAINT "_BookingEquipments_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_BookingEquipments_AB_unique";

-- AlterTable
ALTER TABLE "_EventSocialSettingToSponsorLogo" ADD CONSTRAINT "_EventSocialSettingToSponsorLogo_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_EventSocialSettingToSponsorLogo_AB_unique";

-- AlterTable
ALTER TABLE "collaborators" ADD COLUMN     "functionId" TEXT,
ALTER COLUMN "collaboratorRole" SET DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE "event_collaborators" ADD COLUMN     "functionId" TEXT,
ALTER COLUMN "role" SET DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE "event_social_settings" ADD COLUMN     "enableGamification" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enableMosaic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mosaicFrequency" INTEGER NOT NULL DEFAULT 15;

-- CreateTable
CREATE TABLE "collaborator_functions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collaborator_functions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "collaborator_functions_name_key" ON "collaborator_functions"("name");

-- CreateIndex
CREATE INDEX "collaborators_functionId_idx" ON "collaborators"("functionId");

-- CreateIndex
CREATE INDEX "event_collaborators_functionId_idx" ON "event_collaborators"("functionId");

-- AddForeignKey
ALTER TABLE "collaborators" ADD CONSTRAINT "collaborators_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "collaborator_functions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_collaborators" ADD CONSTRAINT "event_collaborators_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "collaborator_functions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
