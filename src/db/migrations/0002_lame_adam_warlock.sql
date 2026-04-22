ALTER TABLE "facilities" ADD COLUMN "slug" text;--> statement-breakpoint
WITH normalized AS (
  SELECT
    id,
    company_id,
    COALESCE(
      NULLIF(
        lower(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '-', 'g')),
        ''
      ),
      'facility'
    ) AS base_slug
  FROM "facilities"
),
ranked AS (
  SELECT
    id,
    company_id,
    base_slug,
    row_number() OVER (
      PARTITION BY company_id, base_slug
      ORDER BY id
    ) AS slug_rank
  FROM normalized
)
UPDATE "facilities" AS f
SET "slug" = CASE
  WHEN r.slug_rank = 1 THEN r.base_slug
  ELSE r.base_slug || '-' || r.slug_rank
END
FROM ranked AS r
WHERE f.id = r.id;--> statement-breakpoint
ALTER TABLE "facilities" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "facility_company_slug_idx" ON "facilities" USING btree ("company_id","slug");