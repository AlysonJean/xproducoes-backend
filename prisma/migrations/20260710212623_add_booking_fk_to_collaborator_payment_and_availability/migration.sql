-- CreateIndex
CREATE INDEX "collaborator_availabilities_eventId_idx" ON "collaborator_availabilities"("eventId");

-- CreateIndex
CREATE INDEX "collaborator_payments_eventId_idx" ON "collaborator_payments"("eventId");

-- AddForeignKey
ALTER TABLE "collaborator_availabilities" ADD CONSTRAINT "collaborator_availabilities_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborator_payments" ADD CONSTRAINT "collaborator_payments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
