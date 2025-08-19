-- CreateTable
CREATE TABLE "public"."booking_attachments" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "booking_attachments_bookingId_idx" ON "public"."booking_attachments"("bookingId");

-- AddForeignKey
ALTER TABLE "public"."booking_attachments" ADD CONSTRAINT "booking_attachments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
