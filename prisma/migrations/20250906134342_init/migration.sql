-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('CLIENT', 'COLLABORATOR', 'ADMIN', 'MANAGER', 'OPERATOR');

-- CreateEnum
CREATE TYPE "public"."CollaboratorRole" AS ENUM ('PHOTOGRAPHER', 'VIDEOGRAPHER', 'SOUND_TECHNICIAN', 'LIGHTING_TECHNICIAN', 'DJ', 'PRESENTER', 'COORDINATOR', 'ASSISTANT', 'SECURITY', 'TRANSPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."CollaboratorStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_APPROVAL');

-- CreateEnum
CREATE TYPE "public"."BookingStatus" AS ENUM ('DRAFT', 'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."DeliveryStatus" AS ENUM ('PENDING', 'PREPARING', 'ON_THE_WAY', 'ARRIVED', 'SETUP_COMPLETE', 'PICKUP_PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."EventCollaboratorStatus" AS ENUM ('ASSIGNED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "public"."AvailabilityStatus" AS ENUM ('AVAILABLE', 'BUSY', 'OFF_DUTY', 'VACATION');

-- CreateEnum
CREATE TYPE "public"."PaymentType" AS ENUM ('HOURLY', 'FIXED', 'COMMISSION', 'BONUS', 'DEDUCTION');

-- CreateEnum
CREATE TYPE "public"."CollaboratorPaymentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "public"."MessageType" AS ENUM ('TEXT', 'IMAGE', 'FILE', 'SYSTEM', 'NOTIFICATION');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('BOOKING_CREATED', 'BOOKING_UPDATED', 'BOOKING_CANCELLED', 'PAYMENT_DUE', 'PAYMENT_RECEIVED', 'REVIEW_RECEIVED', 'MESSAGE_RECEIVED', 'SYSTEM_ALERT', 'MAINTENANCE_SCHEDULED');

-- CreateTable
CREATE TABLE "public"."Contact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Portfolio" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "imageUrl" TEXT NOT NULL,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PortfolioItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."faqs" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" "public"."UserRole" NOT NULL DEFAULT 'CLIENT',
    "bio" TEXT,
    "location" TEXT,
    "website" TEXT,
    "socialLinks" JSONB,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "passwordResetToken" TEXT,
    "passwordResetTokenExpiry" TIMESTAMP(3),
    "emailVerificationToken" TEXT,
    "emailVerificationTokenExpiry" TIMESTAMP(3),
    "profileSettings" JSONB,
    "isVip" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."clients" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "companyName" TEXT,
    "industry" TEXT,
    "companySize" TEXT,
    "address" JSONB,
    "jobTitle" TEXT,
    "department" TEXT,
    "budget" JSONB,
    "preferredCategories" TEXT[],
    "eventTypes" TEXT[],
    "communicationPrefs" JSONB,
    "totalBookings" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "averageRating" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "completedBookings" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."collaborators" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "collaboratorRole" "public"."CollaboratorRole" NOT NULL,
    "specialties" TEXT[],
    "status" "public"."CollaboratorStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "experience" TEXT,
    "portfolio" JSONB,
    "hourlyRate" DECIMAL(65,30),
    "equipment" TEXT[],
    "certifications" TEXT[],
    "workingRadius" INTEGER,
    "languages" TEXT[],
    "totalEvents" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "averageRating" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "completedEvents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."equipments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "pricePerHour" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT[],
    "specifications" JSONB,
    "weight" DECIMAL(8,2),
    "dimensions" JSONB,
    "powerRequirements" TEXT,
    "maintenanceNotes" TEXT,
    "maintenanceDate" TIMESTAMP(3),
    "purchaseDate" TIMESTAMP(3),
    "warrantyExpiration" TIMESTAMP(3),
    "condition" TEXT NOT NULL DEFAULT 'EXCELLENT',
    "serialNumber" TEXT,
    "location" TEXT,
    "minimumRentalDuration" INTEGER NOT NULL DEFAULT 1,
    "replacementCost" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "equipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "parentId" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "keywords" TEXT,
    "ogImage" TEXT,
    "imageUrl" TEXT,
    "imageAlt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."kits" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "category" TEXT,
    "tags" TEXT[],
    "minimumRentalDuration" INTEGER,
    "setupInstructions" TEXT,
    "targetAudience" TEXT[],
    "skillLevel" TEXT,
    "estimatedSetupTime" INTEGER,
    "weight" DECIMAL(8,2),
    "transportRequirements" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "coverImage" TEXT,
    "images" TEXT[],
    "setupGuides" TEXT[],
    "recommended" BOOLEAN NOT NULL DEFAULT false,
    "popular" BOOLEAN NOT NULL DEFAULT false,
    "discount" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bookings" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "eventTitle" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "eventEndDate" TIMESTAMP(3) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "serviceValue" DECIMAL(10,2),
    "paymentProofUrl" TEXT,
    "status" "public"."BookingStatus" NOT NULL DEFAULT 'DRAFT',
    "requiresStairs" BOOLEAN NOT NULL DEFAULT false,
    "isCovered" BOOLEAN NOT NULL DEFAULT true,
    "hasParking" BOOLEAN NOT NULL DEFAULT true,
    "eventDuration" INTEGER,
    "location" TEXT,
    "street" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "addressNumber" TEXT,
    "addressComplement" TEXT,
    "clientName" TEXT,
    "clientContact" TEXT,
    "clientEmail" TEXT,
    "notes" TEXT,
    "internalNotes" TEXT,
    "specialRequests" TEXT,
    "deliveryStatus" "public"."DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "setupTime" TIMESTAMP(3),
    "pickupTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT,
    "creatorId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "kitId" TEXT,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "public"."event_collaborators" (
    "id" TEXT NOT NULL,
    "role" "public"."CollaboratorRole" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "hourlyRate" DECIMAL(8,2),
    "fixedRate" DECIMAL(10,2),
    "totalHours" DECIMAL(5,2),
    "totalPayment" DECIMAL(10,2),
    "status" "public"."EventCollaboratorStatus" NOT NULL DEFAULT 'ASSIGNED',
    "notes" TEXT,
    "rating" INTEGER,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bookingId" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,

    CONSTRAINT "event_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."client_favorites" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,

    CONSTRAINT "client_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reviews" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "photos" TEXT[],
    "tags" TEXT[],
    "punctuality" INTEGER,
    "professionalism" INTEGER,
    "quality" INTEGER,
    "communication" INTEGER,
    "valueForMoney" INTEGER,
    "helpful" INTEGER NOT NULL DEFAULT 0,
    "reported" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bookingId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "collaboratorId" TEXT,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."messages" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "public"."MessageType" NOT NULL DEFAULT 'TEXT',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "important" BOOLEAN NOT NULL DEFAULT false,
    "attachments" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "bookingId" TEXT,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "important" BOOLEAN NOT NULL DEFAULT false,
    "actionUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."collaborator_availabilities" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" "public"."AvailabilityStatus" NOT NULL,
    "eventId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "collaboratorId" TEXT NOT NULL,

    CONSTRAINT "collaborator_availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invite_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "invitedBy" TEXT,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invite_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."collaborator_payments" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" "public"."PaymentType" NOT NULL DEFAULT 'HOURLY',
    "description" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paymentDate" TIMESTAMP(3),
    "status" "public"."CollaboratorPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "collaboratorId" TEXT NOT NULL,

    CONSTRAINT "collaborator_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."booking_audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "booking_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."webhook_logs" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "responseCode" INTEGER,
    "responseBody" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_KitEquipments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_KitEquipments_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_BookingEquipments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BookingEquipments_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_passwordResetToken_key" ON "public"."users"("passwordResetToken");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "public"."users"("role");

-- CreateIndex
CREATE INDEX "users_role_createdAt_idx" ON "public"."users"("role", "createdAt");

-- CreateIndex
CREATE INDEX "users_verified_role_idx" ON "public"."users"("verified", "role");

-- CreateIndex
CREATE UNIQUE INDEX "clients_userId_key" ON "public"."clients"("userId");

-- CreateIndex
CREATE INDEX "clients_userId_idx" ON "public"."clients"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "collaborators_userId_key" ON "public"."collaborators"("userId");

-- CreateIndex
CREATE INDEX "collaborators_userId_idx" ON "public"."collaborators"("userId");

-- CreateIndex
CREATE INDEX "collaborators_status_idx" ON "public"."collaborators"("status");

-- CreateIndex
CREATE INDEX "collaborators_collaboratorRole_idx" ON "public"."collaborators"("collaboratorRole");

-- CreateIndex
CREATE INDEX "collaborators_status_collaboratorRole_idx" ON "public"."collaborators"("status", "collaboratorRole");

-- CreateIndex
CREATE INDEX "collaborators_userId_status_idx" ON "public"."collaborators"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "equipments_serialNumber_key" ON "public"."equipments"("serialNumber");

-- CreateIndex
CREATE INDEX "equipments_categoryId_idx" ON "public"."equipments"("categoryId");

-- CreateIndex
CREATE INDEX "equipments_name_idx" ON "public"."equipments"("name");

-- CreateIndex
CREATE INDEX "equipments_condition_idx" ON "public"."equipments"("condition");

-- CreateIndex
CREATE INDEX "equipments_categoryId_condition_idx" ON "public"."equipments"("categoryId", "condition");

-- CreateIndex
CREATE INDEX "equipments_pricePerHour_idx" ON "public"."equipments"("pricePerHour");

-- CreateIndex
CREATE INDEX "equipments_name_categoryId_idx" ON "public"."equipments"("name", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "public"."categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "public"."categories"("slug");

-- CreateIndex
CREATE INDEX "categories_active_sortOrder_idx" ON "public"."categories"("active", "sortOrder");

-- CreateIndex
CREATE INDEX "categories_slug_idx" ON "public"."categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parentId_idx" ON "public"."categories"("parentId");

-- CreateIndex
CREATE INDEX "kits_recommended_idx" ON "public"."kits"("recommended");

-- CreateIndex
CREATE INDEX "kits_popular_idx" ON "public"."kits"("popular");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_idempotencyKey_key" ON "public"."bookings"("idempotencyKey");

-- CreateIndex
CREATE INDEX "bookings_clientId_idx" ON "public"."bookings"("clientId");

-- CreateIndex
CREATE INDEX "bookings_creatorId_idx" ON "public"."bookings"("creatorId");

-- CreateIndex
CREATE INDEX "bookings_assigneeId_idx" ON "public"."bookings"("assigneeId");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "public"."bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_eventDate_idx" ON "public"."bookings"("eventDate");

-- CreateIndex
CREATE INDEX "bookings_deliveryStatus_idx" ON "public"."bookings"("deliveryStatus");

-- CreateIndex
CREATE INDEX "bookings_eventDate_status_idx" ON "public"."bookings"("eventDate", "status");

-- CreateIndex
CREATE INDEX "bookings_creatorId_status_idx" ON "public"."bookings"("creatorId", "status");

-- CreateIndex
CREATE INDEX "bookings_clientId_status_idx" ON "public"."bookings"("clientId", "status");

-- CreateIndex
CREATE INDEX "bookings_status_eventDate_idx" ON "public"."bookings"("status", "eventDate");

-- CreateIndex
CREATE INDEX "bookings_eventDate_eventEndDate_idx" ON "public"."bookings"("eventDate", "eventEndDate");

-- CreateIndex
CREATE INDEX "booking_attachments_bookingId_idx" ON "public"."booking_attachments"("bookingId");

-- CreateIndex
CREATE INDEX "event_collaborators_bookingId_idx" ON "public"."event_collaborators"("bookingId");

-- CreateIndex
CREATE INDEX "event_collaborators_collaboratorId_idx" ON "public"."event_collaborators"("collaboratorId");

-- CreateIndex
CREATE INDEX "event_collaborators_status_idx" ON "public"."event_collaborators"("status");

-- CreateIndex
CREATE INDEX "event_collaborators_bookingId_status_idx" ON "public"."event_collaborators"("bookingId", "status");

-- CreateIndex
CREATE INDEX "event_collaborators_collaboratorId_status_idx" ON "public"."event_collaborators"("collaboratorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "event_collaborators_bookingId_collaboratorId_role_key" ON "public"."event_collaborators"("bookingId", "collaboratorId", "role");

-- CreateIndex
CREATE INDEX "client_favorites_clientId_idx" ON "public"."client_favorites"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "client_favorites_clientId_equipmentId_key" ON "public"."client_favorites"("clientId", "equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_bookingId_key" ON "public"."reviews"("bookingId");

-- CreateIndex
CREATE INDEX "reviews_reviewerId_idx" ON "public"."reviews"("reviewerId");

-- CreateIndex
CREATE INDEX "reviews_collaboratorId_idx" ON "public"."reviews"("collaboratorId");

-- CreateIndex
CREATE INDEX "reviews_rating_idx" ON "public"."reviews"("rating");

-- CreateIndex
CREATE INDEX "reviews_rating_createdAt_idx" ON "public"."reviews"("rating", "createdAt");

-- CreateIndex
CREATE INDEX "reviews_collaboratorId_rating_idx" ON "public"."reviews"("collaboratorId", "rating");

-- CreateIndex
CREATE INDEX "messages_senderId_idx" ON "public"."messages"("senderId");

-- CreateIndex
CREATE INDEX "messages_recipientId_idx" ON "public"."messages"("recipientId");

-- CreateIndex
CREATE INDEX "messages_bookingId_idx" ON "public"."messages"("bookingId");

-- CreateIndex
CREATE INDEX "messages_read_idx" ON "public"."messages"("read");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "public"."notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_clientId_idx" ON "public"."notifications"("clientId");

-- CreateIndex
CREATE INDEX "notifications_read_idx" ON "public"."notifications"("read");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "public"."notifications"("type");

-- CreateIndex
CREATE INDEX "collaborator_availabilities_collaboratorId_idx" ON "public"."collaborator_availabilities"("collaboratorId");

-- CreateIndex
CREATE INDEX "collaborator_availabilities_date_idx" ON "public"."collaborator_availabilities"("date");

-- CreateIndex
CREATE INDEX "collaborator_availabilities_status_idx" ON "public"."collaborator_availabilities"("status");

-- CreateIndex
CREATE UNIQUE INDEX "invite_tokens_token_key" ON "public"."invite_tokens"("token");

-- CreateIndex
CREATE INDEX "invite_tokens_email_idx" ON "public"."invite_tokens"("email");

-- CreateIndex
CREATE INDEX "collaborator_payments_collaboratorId_idx" ON "public"."collaborator_payments"("collaboratorId");

-- CreateIndex
CREATE INDEX "collaborator_payments_status_idx" ON "public"."collaborator_payments"("status");

-- CreateIndex
CREATE INDEX "collaborator_payments_dueDate_idx" ON "public"."collaborator_payments"("dueDate");

-- CreateIndex
CREATE INDEX "booking_audit_logs_bookingId_idx" ON "public"."booking_audit_logs"("bookingId");

-- CreateIndex
CREATE INDEX "booking_audit_logs_userId_idx" ON "public"."booking_audit_logs"("userId");

-- CreateIndex
CREATE INDEX "booking_audit_logs_timestamp_idx" ON "public"."booking_audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "booking_audit_logs_action_idx" ON "public"."booking_audit_logs"("action");

-- CreateIndex
CREATE INDEX "webhook_logs_event_idx" ON "public"."webhook_logs"("event");

-- CreateIndex
CREATE INDEX "webhook_logs_bookingId_idx" ON "public"."webhook_logs"("bookingId");

-- CreateIndex
CREATE INDEX "_KitEquipments_B_index" ON "public"."_KitEquipments"("B");

-- CreateIndex
CREATE INDEX "_BookingEquipments_B_index" ON "public"."_BookingEquipments"("B");

-- AddForeignKey
ALTER TABLE "public"."clients" ADD CONSTRAINT "clients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."collaborators" ADD CONSTRAINT "collaborators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."equipments" ADD CONSTRAINT "equipments_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "public"."kits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."booking_attachments" ADD CONSTRAINT "booking_attachments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_collaborators" ADD CONSTRAINT "event_collaborators_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_collaborators" ADD CONSTRAINT "event_collaborators_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "public"."collaborators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."client_favorites" ADD CONSTRAINT "client_favorites_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."client_favorites" ADD CONSTRAINT "client_favorites_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "public"."equipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "public"."collaborators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."collaborator_availabilities" ADD CONSTRAINT "collaborator_availabilities_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "public"."collaborators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."collaborator_payments" ADD CONSTRAINT "collaborator_payments_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "public"."collaborators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."booking_audit_logs" ADD CONSTRAINT "booking_audit_logs_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."booking_audit_logs" ADD CONSTRAINT "booking_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_KitEquipments" ADD CONSTRAINT "_KitEquipments_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."equipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_KitEquipments" ADD CONSTRAINT "_KitEquipments_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."kits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_BookingEquipments" ADD CONSTRAINT "_BookingEquipments_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_BookingEquipments" ADD CONSTRAINT "_BookingEquipments_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."equipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
