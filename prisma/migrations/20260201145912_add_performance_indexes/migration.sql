-- CreateIndex
CREATE INDEX "booking_audit_logs_bookingId_timestamp_idx" ON "booking_audit_logs"("bookingId", "timestamp");

-- CreateIndex
CREATE INDEX "booking_audit_logs_userId_timestamp_idx" ON "booking_audit_logs"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "chat_messages_chatId_idx" ON "chat_messages"("chatId");

-- CreateIndex
CREATE INDEX "chat_messages_senderId_idx" ON "chat_messages"("senderId");

-- CreateIndex
CREATE INDEX "chat_messages_chatId_createdAt_idx" ON "chat_messages"("chatId", "createdAt");

-- CreateIndex
CREATE INDEX "webhook_logs_status_idx" ON "webhook_logs"("status");

-- CreateIndex
CREATE INDEX "webhook_logs_event_createdAt_idx" ON "webhook_logs"("event", "createdAt");

-- CreateIndex
CREATE INDEX "webhook_logs_status_createdAt_idx" ON "webhook_logs"("status", "createdAt");
