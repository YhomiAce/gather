CREATE TYPE "public"."location_kind" AS ENUM('venue', 'online');--> statement-breakpoint
CREATE TYPE "public"."rsvp_response" AS ENUM('going', 'maybe', 'not_going');--> statement-breakpoint
CREATE TYPE "public"."rsvp_status" AS ENUM('confirmed', 'waitlisted', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."event_visibility" AS ENUM('public', 'unlisted');--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"time_zone" text NOT NULL,
	"location_kind" "location_kind" NOT NULL,
	"location" text NOT NULL,
	"capacity" integer,
	"cover_color" text DEFAULT '#4f46e5' NOT NULL,
	"cover_emoji" text,
	"visibility" "event_visibility" DEFAULT 'public' NOT NULL,
	"question" text,
	"host_name" text NOT NULL,
	"host_email" text,
	"manage_token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_capacity_positive" CHECK ("events"."capacity" IS NULL OR "events"."capacity" > 0),
	CONSTRAINT "events_ends_after_start" CHECK ("events"."ends_at" > "events"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "rsvps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"response" "rsvp_response" NOT NULL,
	"status" "rsvp_status" NOT NULL,
	"answer" text,
	"token_hash" text NOT NULL,
	"waitlisted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "events_slug_idx" ON "events" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "events_manage_token_idx" ON "events" USING btree ("manage_token_hash");--> statement-breakpoint
CREATE INDEX "events_public_upcoming_idx" ON "events" USING btree ("visibility","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rsvps_event_email_idx" ON "rsvps" USING btree ("event_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "rsvps_token_idx" ON "rsvps" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "rsvps_event_status_idx" ON "rsvps" USING btree ("event_id","status","waitlisted_at");