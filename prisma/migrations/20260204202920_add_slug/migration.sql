/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `equipments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `kits` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `equipments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `kits` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "equipments" ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "kits" ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "portfolios" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "equipments_slug_key" ON "equipments"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "kits_slug_key" ON "kits"("slug");
