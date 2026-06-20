CREATE TABLE "deals" (
	"id" serial PRIMARY KEY NOT NULL,
	"moskit_id" text NOT NULL,
	"name" text,
	"imobiliaria_id" integer,
	"moskit_company_id" text,
	"moskit_contact_id" text,
	"owner_id" integer,
	"pipeline_id" text,
	"pipeline_name" text,
	"stage_id" text,
	"stage_name" text,
	"funnel_step" "funnel_step",
	"is_proposta" boolean DEFAULT false NOT NULL,
	"status" text,
	"value_cents" bigint,
	"lost_reason" text,
	"deal_created_at" timestamp with time zone,
	"close_date" timestamp with time zone,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"utm_content" text,
	"utm_term" text,
	"inbound_origin_raw" text,
	"cidade" text,
	"uf" text,
	"raw" jsonb,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deals_moskit_id_unique" UNIQUE("moskit_id")
);
--> statement-breakpoint
ALTER TABLE "imobiliarias" ADD COLUMN "avalyst_id" text;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_imobiliaria_id_imobiliarias_id_fk" FOREIGN KEY ("imobiliaria_id") REFERENCES "public"."imobiliarias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deal_imob_idx" ON "deals" USING btree ("imobiliaria_id");--> statement-breakpoint
CREATE INDEX "deal_company_idx" ON "deals" USING btree ("moskit_company_id");--> statement-breakpoint
CREATE INDEX "deal_owner_idx" ON "deals" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "deal_stage_idx" ON "deals" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX "deal_status_idx" ON "deals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "deal_proposta_idx" ON "deals" USING btree ("is_proposta");--> statement-breakpoint
CREATE INDEX "deal_created_idx" ON "deals" USING btree ("deal_created_at");