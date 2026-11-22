CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#287f83' NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"amount_cents" bigint NOT NULL,
	"concept" text DEFAULT '' NOT NULL,
	"category_id" uuid,
	"date" date NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"payment_method" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"subscription_id" uuid,
	"occurrence_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "movement_amount" CHECK ("movements"."amount_cents">0 AND "movements"."amount_cents"<=999999999999),
	CONSTRAINT "movement_kind" CHECK ("movements"."kind" IN ('expense','income'))
);
--> statement-breakpoint
CREATE TABLE "platforms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "platforms_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"locale" text DEFAULT 'es-ES' NOT NULL,
	"timezone" text DEFAULT 'Europe/Madrid' NOT NULL,
	"week_starts_on" integer DEFAULT 1 NOT NULL,
	"show_income" boolean DEFAULT true NOT NULL,
	"show_projections" boolean DEFAULT true NOT NULL,
	CONSTRAINT "settings_singleton" CHECK ("settings"."id"=1)
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"amount_cents" bigint NOT NULL,
	"concept" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category_id" uuid,
	"platform_id" uuid,
	"start_date" date NOT NULL,
	"next_payment_date" date NOT NULL,
	"anchor_day" integer NOT NULL,
	"frequency" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_amount" CHECK ("subscriptions"."amount_cents">0 AND "subscriptions"."amount_cents"<=999999999999),
	CONSTRAINT "subscription_anchor" CHECK ("subscriptions"."anchor_day" BETWEEN 1 AND 31),
	CONSTRAINT "subscription_dates" CHECK ("subscriptions"."next_payment_date">="subscriptions"."start_date"),
	CONSTRAINT "subscription_frequency" CHECK ("subscriptions"."frequency" IN ('weekly','monthly','quarterly','semiannual','annual')),
	CONSTRAINT "subscription_status" CHECK ("subscriptions"."status" IN ('active','paused','cancelled'))
);
--> statement-breakpoint
ALTER TABLE "movements" ADD CONSTRAINT "movements_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movements" ADD CONSTRAINT "movements_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "movement_subscription_occurrence" ON "movements" USING btree ("subscription_id","occurrence_date");--> statement-breakpoint
CREATE INDEX "movement_kind_date_idx" ON "movements" USING btree ("kind","date");--> statement-breakpoint
CREATE INDEX "movement_category_idx" ON "movements" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "subscription_due_idx" ON "subscriptions" USING btree ("next_payment_date");