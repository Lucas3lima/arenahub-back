CREATE TYPE "public"."court_status" AS ENUM('open', 'closed', 'maintenance');--> statement-breakpoint
ALTER TYPE "public"."sport_type" ADD VALUE 'padel' BEFORE 'outro';--> statement-breakpoint
ALTER TYPE "public"."sport_type" ADD VALUE 'areia' BEFORE 'outro';--> statement-breakpoint
CREATE TABLE "court_opening_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"court_id" uuid NOT NULL,
	"weekday" integer NOT NULL,
	"start_minute" integer NOT NULL,
	"end_minute" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "court_weekday_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"court_id" uuid NOT NULL,
	"weekday" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "courts" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "courts" ADD COLUMN "status" "court_status" DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "courts" ADD COLUMN "base_price_cents" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "courts" ADD COLUMN "rental_duration_minutes" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "courts" ADD COLUMN "buffer_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "court_opening_hours" ADD CONSTRAINT "court_opening_hours_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "court_weekday_prices" ADD CONSTRAINT "court_weekday_prices_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "court_opening_hours_unique_range_idx" ON "court_opening_hours" USING btree ("court_id","weekday","start_minute","end_minute");--> statement-breakpoint
CREATE UNIQUE INDEX "court_weekday_prices_court_weekday_idx" ON "court_weekday_prices" USING btree ("court_id","weekday");