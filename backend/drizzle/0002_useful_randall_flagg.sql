CREATE TABLE "wealth_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"destination" text NOT NULL,
	"direction" text NOT NULL,
	"amount_cents" bigint NOT NULL,
	"date" date NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wealth_kind" CHECK ("wealth_entries"."kind" IN ('savings','investments')),
	CONSTRAINT "wealth_direction" CHECK ("wealth_entries"."direction" IN ('deposit','withdrawal')),
	CONSTRAINT "wealth_amount" CHECK ("wealth_entries"."amount_cents">0 AND "wealth_entries"."amount_cents"<=999999999999),
	CONSTRAINT "wealth_destination" CHECK (length(trim("wealth_entries"."destination")) BETWEEN 1 AND 120)
);
--> statement-breakpoint
CREATE INDEX "wealth_kind_date_idx" ON "wealth_entries" USING btree ("kind","date");