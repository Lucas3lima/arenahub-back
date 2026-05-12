CREATE TYPE "public"."booking_pricing_rule" AS ENUM('base', 'weekday', 'override');--> statement-breakpoint
CREATE TYPE "public"."booking_source" AS ENUM('public', 'staff');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'card', 'pix', 'online');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'paid', 'partial', 'refunded');--> statement-breakpoint
ALTER TYPE "public"."booking_status" ADD VALUE 'expired';--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "customer_email" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "customer_document" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "source" "booking_source" DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "created_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "total_price_cents" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "pricing_rule" "booking_pricing_rule" DEFAULT 'base' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "payment_status" "payment_status" DEFAULT 'unpaid' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "payment_method" "payment_method";--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "external_payment_id" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "payment_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "cancelled_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "cancellation_reason" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_cancelled_by_user_id_users_id_fk" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_company_court_starts_at_idx" ON "bookings" USING btree ("company_id","court_id","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_company_id_starts_at_idx" ON "bookings" USING btree ("company_id","starts_at","id");