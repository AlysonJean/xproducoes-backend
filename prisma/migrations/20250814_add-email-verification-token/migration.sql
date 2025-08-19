-- Migration: add email verification token fields to user
-- This migration is create-only and not applied automatically.

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "emailVerificationToken" text;

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "emailVerificationTokenExpiry" timestamp;

-- Add index on emailVerificationToken for lookup
CREATE INDEX IF NOT EXISTS "idx_users_email_verification_token" ON "users" ("emailVerificationToken");
