CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'cancelled', 'expired');--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"price" integer NOT NULL,
	"max_courts" integer NOT NULL,
	"max_users" integer NOT NULL,
	"max_facilities" integer NOT NULL,
	"trial_days" integer DEFAULT 0 NOT NULL,
	"has_advanced_reports" boolean DEFAULT false NOT NULL,
	"has_custom_permissions" boolean DEFAULT false NOT NULL,
	"has_cancellation_policies" boolean DEFAULT false NOT NULL,
	"has_public_page" boolean DEFAULT true NOT NULL,
	"has_online_reservations" boolean DEFAULT true NOT NULL,
	"has_financial_control" boolean DEFAULT true NOT NULL,
	"has_online_payment" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"current_period_starts_at" timestamp with time zone NOT NULL,
	"current_period_ends_at" timestamp with time zone NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"external_subscription_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "active_subscription_idx" ON "subscriptions" USING btree ("company_id") WHERE "subscriptions"."status" IN ('trialing', 'active', 'past_due');--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN "current_plan";--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN "trial_ends_at";--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN "max_courts";--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN "max_facilities";--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN "max_users";