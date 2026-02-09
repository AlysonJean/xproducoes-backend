-- CreateTable
CREATE TABLE "_BookingServices" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BookingServices_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_BookingServices_B_index" ON "_BookingServices"("B");

-- AddForeignKey
ALTER TABLE "_BookingServices" ADD CONSTRAINT "_BookingServices_A_fkey" FOREIGN KEY ("A") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BookingServices" ADD CONSTRAINT "_BookingServices_B_fkey" FOREIGN KEY ("B") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
