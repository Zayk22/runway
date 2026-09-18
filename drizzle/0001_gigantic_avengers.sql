CREATE TYPE "public"."pacing_mode" AS ENUM('daily', 'weekly');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pacing_mode" "pacing_mode" DEFAULT 'daily' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_step" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "cap_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "baseline_completed_at" timestamp with time zone;