-- AlterTable
ALTER TABLE "event_social_settings" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "social_posts" ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderatedBy" TEXT;

-- CreateIndex
CREATE INDEX "event_social_settings_userId_idx" ON "event_social_settings"("userId");

-- AddForeignKey
ALTER TABLE "event_social_settings" ADD CONSTRAINT "event_social_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_moderatedBy_fkey" FOREIGN KEY ("moderatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
