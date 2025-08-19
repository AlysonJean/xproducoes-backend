-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'COLLABORATOR', 'ADMIN', 'MANAGER', 'OPERATOR');

-- CreateEnum
CREATE TYPE "CollaboratorRole" AS ENUM ('PHOTOGRAPHER', 'VIDEOGRAPHER', 'SOUND_TECHNICIAN', 'LIGHTING_TECHNICIAN', 'DJ', 'PRESENTER', 'COORDINATOR', 'ASSISTANT', 'SECURITY', 'TRANSPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "CollaboratorStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_APPROVAL');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('DRAFT', 'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'PREPARING', 'ON_THE_WAY', 'ARRIVED', 'SETUP_COMPLETE', 'PICKUP_PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "EventCollaboratorStatus" AS ENUM ('ASSIGNED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'BUSY', 'OFF_DUTY', 'VACATION');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('HOURLY', 'FIXED', 'COMMISSION', 'BONUS', 'DEDUCTION');

-- CreateEnum
CREATE TYPE "CollaboratorPaymentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'FILE', 'SYSTEM', 'NOTIFICATION');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BOOKING_CREATED', 'BOOKING_UPDATED', 'BOOKING_CANCELLED', 'PAYMENT_DUE', 'PAYMENT_RECEIVED', 'REVIEW_RECEIVED', 'MESSAGE_RECEIVED', 'SYSTEM_ALERT', 'MAINTENANCE_SCHEDULED');

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "imageUrl" TEXT NOT NULL,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "bio" TEXT,
    "location" TEXT,
    "website" TEXT,
    "socialLinks" JSONB,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "passwordResetToken" TEXT,
    "passwordResetTokenExpiry" TIMESTAMP(3),
    "profileSettings" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
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
CREATE TABLE "collaborators" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "collaboratorRole" "CollaboratorRole" NOT NULL,
    "specialties" TEXT[],
    "status" "CollaboratorStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
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
CREATE TABLE "equipments" (
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
CREATE TABLE "categories" (
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
CREATE TABLE "kits" (
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
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "eventTitle" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "eventEndDate" TIMESTAMP(3) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'DRAFT',
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
    "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
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
CREATE TABLE "event_collaborators" (
    "id" TEXT NOT NULL,
    "role" "CollaboratorRole" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "hourlyRate" DECIMAL(8,2),
    "fixedRate" DECIMAL(10,2),
    "totalHours" DECIMAL(5,2),
    "totalPayment" DECIMAL(10,2),
    "status" "EventCollaboratorStatus" NOT NULL DEFAULT 'ASSIGNED',
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
CREATE TABLE "client_favorites" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,

    CONSTRAINT "client_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
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
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
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
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
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
CREATE TABLE "collaborator_availabilities" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" "AvailabilityStatus" NOT NULL,
    "eventId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "collaboratorId" TEXT NOT NULL,

    CONSTRAINT "collaborator_availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collaborator_payments" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" "PaymentType" NOT NULL DEFAULT 'HOURLY',
    "description" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paymentDate" TIMESTAMP(3),
    "status" "CollaboratorPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "collaboratorId" TEXT NOT NULL,

    CONSTRAINT "collaborator_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_audit_logs" (
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
CREATE TABLE "_KitEquipments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_KitEquipments_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_BookingEquipments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BookingEquipments_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_passwordResetToken_key" ON "users"("passwordResetToken");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_role_createdAt_idx" ON "users"("role", "createdAt");

-- CreateIndex
CREATE INDEX "users_verified_role_idx" ON "users"("verified", "role");

-- CreateIndex
CREATE UNIQUE INDEX "clients_userId_key" ON "clients"("userId");

-- CreateIndex
CREATE INDEX "clients_userId_idx" ON "clients"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "collaborators_userId_key" ON "collaborators"("userId");

-- CreateIndex
CREATE INDEX "collaborators_userId_idx" ON "collaborators"("userId");

-- CreateIndex
CREATE INDEX "collaborators_status_idx" ON "collaborators"("status");

-- CreateIndex
CREATE INDEX "collaborators_collaboratorRole_idx" ON "collaborators"("collaboratorRole");

-- CreateIndex
CREATE INDEX "collaborators_status_collaboratorRole_idx" ON "collaborators"("status", "collaboratorRole");

-- CreateIndex
CREATE INDEX "collaborators_userId_status_idx" ON "collaborators"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "equipments_serialNumber_key" ON "equipments"("serialNumber");

-- CreateIndex
CREATE INDEX "equipments_categoryId_idx" ON "equipments"("categoryId");

-- CreateIndex
CREATE INDEX "equipments_name_idx" ON "equipments"("name");

-- CreateIndex
CREATE INDEX "equipments_condition_idx" ON "equipments"("condition");

-- CreateIndex
CREATE INDEX "equipments_categoryId_condition_idx" ON "equipments"("categoryId", "condition");

-- CreateIndex
CREATE INDEX "equipments_pricePerHour_idx" ON "equipments"("pricePerHour");

-- CreateIndex
CREATE INDEX "equipments_name_categoryId_idx" ON "equipments"("name", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_active_sortOrder_idx" ON "categories"("active", "sortOrder");

-- CreateIndex
CREATE INDEX "categories_slug_idx" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parentId_idx" ON "categories"("parentId");

-- CreateIndex
CREATE INDEX "kits_recommended_idx" ON "kits"("recommended");

-- CreateIndex
CREATE INDEX "kits_popular_idx" ON "kits"("popular");

-- CreateIndex
CREATE INDEX "bookings_clientId_idx" ON "bookings"("clientId");

-- CreateIndex
CREATE INDEX "bookings_creatorId_idx" ON "bookings"("creatorId");

-- CreateIndex
CREATE INDEX "bookings_assigneeId_idx" ON "bookings"("assigneeId");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_eventDate_idx" ON "bookings"("eventDate");

-- CreateIndex
CREATE INDEX "bookings_deliveryStatus_idx" ON "bookings"("deliveryStatus");

-- CreateIndex
CREATE INDEX "bookings_eventDate_status_idx" ON "bookings"("eventDate", "status");

-- CreateIndex
CREATE INDEX "bookings_creatorId_status_idx" ON "bookings"("creatorId", "status");

-- CreateIndex
CREATE INDEX "bookings_clientId_status_idx" ON "bookings"("clientId", "status");

-- CreateIndex
CREATE INDEX "bookings_status_eventDate_idx" ON "bookings"("status", "eventDate");

-- CreateIndex
CREATE INDEX "bookings_eventDate_eventEndDate_idx" ON "bookings"("eventDate", "eventEndDate");

-- CreateIndex
CREATE INDEX "event_collaborators_bookingId_idx" ON "event_collaborators"("bookingId");

-- CreateIndex
CREATE INDEX "event_collaborators_collaboratorId_idx" ON "event_collaborators"("collaboratorId");

-- CreateIndex
CREATE INDEX "event_collaborators_status_idx" ON "event_collaborators"("status");

-- CreateIndex
CREATE INDEX "event_collaborators_bookingId_status_idx" ON "event_collaborators"("bookingId", "status");

-- CreateIndex
CREATE INDEX "event_collaborators_collaboratorId_status_idx" ON "event_collaborators"("collaboratorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "event_collaborators_bookingId_collaboratorId_role_key" ON "event_collaborators"("bookingId", "collaboratorId", "role");

-- CreateIndex
CREATE INDEX "client_favorites_clientId_idx" ON "client_favorites"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "client_favorites_clientId_equipmentId_key" ON "client_favorites"("clientId", "equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_bookingId_key" ON "reviews"("bookingId");

-- CreateIndex
CREATE INDEX "reviews_reviewerId_idx" ON "reviews"("reviewerId");

-- CreateIndex
CREATE INDEX "reviews_collaboratorId_idx" ON "reviews"("collaboratorId");

-- CreateIndex
CREATE INDEX "reviews_rating_idx" ON "reviews"("rating");

-- CreateIndex
CREATE INDEX "reviews_rating_createdAt_idx" ON "reviews"("rating", "createdAt");

-- CreateIndex
CREATE INDEX "reviews_collaboratorId_rating_idx" ON "reviews"("collaboratorId", "rating");

-- CreateIndex
CREATE INDEX "messages_senderId_idx" ON "messages"("senderId");

-- CreateIndex
CREATE INDEX "messages_recipientId_idx" ON "messages"("recipientId");

-- CreateIndex
CREATE INDEX "messages_bookingId_idx" ON "messages"("bookingId");

-- CreateIndex
CREATE INDEX "messages_read_idx" ON "messages"("read");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_clientId_idx" ON "notifications"("clientId");

-- CreateIndex
CREATE INDEX "notifications_read_idx" ON "notifications"("read");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "collaborator_availabilities_collaboratorId_idx" ON "collaborator_availabilities"("collaboratorId");

-- CreateIndex
CREATE INDEX "collaborator_availabilities_date_idx" ON "collaborator_availabilities"("date");

-- CreateIndex
CREATE INDEX "collaborator_availabilities_status_idx" ON "collaborator_availabilities"("status");

-- CreateIndex
CREATE INDEX "collaborator_payments_collaboratorId_idx" ON "collaborator_payments"("collaboratorId");

-- CreateIndex
CREATE INDEX "collaborator_payments_status_idx" ON "collaborator_payments"("status");

-- CreateIndex
CREATE INDEX "collaborator_payments_dueDate_idx" ON "collaborator_payments"("dueDate");

-- CreateIndex
CREATE INDEX "booking_audit_logs_bookingId_idx" ON "booking_audit_logs"("bookingId");

-- CreateIndex
CREATE INDEX "booking_audit_logs_userId_idx" ON "booking_audit_logs"("userId");

-- CreateIndex
CREATE INDEX "booking_audit_logs_timestamp_idx" ON "booking_audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "booking_audit_logs_action_idx" ON "booking_audit_logs"("action");

-- CreateIndex
CREATE INDEX "_KitEquipments_B_index" ON "_KitEquipments"("B");

-- CreateIndex
CREATE INDEX "_BookingEquipments_B_index" ON "_BookingEquipments"("B");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborators" ADD CONSTRAINT "collaborators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipments" ADD CONSTRAINT "equipments_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "kits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_collaborators" ADD CONSTRAINT "event_collaborators_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_collaborators" ADD CONSTRAINT "event_collaborators_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "collaborators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_favorites" ADD CONSTRAINT "client_favorites_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_favorites" ADD CONSTRAINT "client_favorites_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "collaborators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborator_availabilities" ADD CONSTRAINT "collaborator_availabilities_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "collaborators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborator_payments" ADD CONSTRAINT "collaborator_payments_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "collaborators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_audit_logs" ADD CONSTRAINT "booking_audit_logs_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_audit_logs" ADD CONSTRAINT "booking_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_KitEquipments" ADD CONSTRAINT "_KitEquipments_A_fkey" FOREIGN KEY ("A") REFERENCES "equipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_KitEquipments" ADD CONSTRAINT "_KitEquipments_B_fkey" FOREIGN KEY ("B") REFERENCES "kits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BookingEquipments" ADD CONSTRAINT "_BookingEquipments_A_fkey" FOREIGN KEY ("A") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BookingEquipments" ADD CONSTRAINT "_BookingEquipments_B_fkey" FOREIGN KEY ("B") REFERENCES "equipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
