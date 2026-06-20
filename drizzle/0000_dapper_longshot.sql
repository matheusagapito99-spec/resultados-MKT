CREATE TYPE "public"."cost_source" AS ENUM('manual', 'import', 'ads_api');--> statement-breakpoint
CREATE TYPE "public"."funnel_step" AS ENUM('lead', 'qualificacao', 'reuniao', 'cadastro', 'ativa', 'churn');--> statement-breakpoint
CREATE TYPE "public"."origin_source" AS ENUM('entry', 'sync', 'webhook', 'manual');--> statement-breakpoint
CREATE TYPE "public"."revenue_kind" AS ENUM('garantia', 'contrato', 'mensalidade', 'outro');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('sdr', 'gestor', 'outro');--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"moskit_id" text,
	"imobiliaria_id" integer NOT NULL,
	"signed_at" timestamp with time zone,
	"value_cents" bigint,
	"status" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contracts_moskit_id_unique" UNIQUE("moskit_id")
);
--> statement-breakpoint
CREATE TABLE "garantias" (
	"id" serial PRIMARY KEY NOT NULL,
	"moskit_id" text,
	"imobiliaria_id" integer NOT NULL,
	"contract_id" integer,
	"contracted_at" timestamp with time zone,
	"value_cents" bigint,
	"tipo" text,
	"status" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "garantias_moskit_id_unique" UNIQUE("moskit_id")
);
--> statement-breakpoint
CREATE TABLE "imobiliaria_stage_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"imobiliaria_id" integer NOT NULL,
	"moskit_stage_name" text,
	"funnel_step" "funnel_step",
	"entered_at" timestamp with time zone NOT NULL,
	"source" "origin_source" DEFAULT 'sync' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imobiliarias" (
	"id" serial PRIMARY KEY NOT NULL,
	"moskit_id" text NOT NULL,
	"moskit_entity" text,
	"name" text NOT NULL,
	"cnpj" text,
	"cidade" text,
	"uf" text,
	"segmento" text,
	"sdr_id" integer,
	"gestor_id" integer,
	"moskit_stage_name" text,
	"funnel_step" "funnel_step",
	"status" text,
	"entered_at" timestamp with time zone,
	"activated_at" timestamp with time zone,
	"first_sale_at" timestamp with time zone,
	"entry_marketing_channel_id" integer,
	"entry_inbound_origin_id" integer,
	"entry_utm_source" text,
	"entry_utm_medium" text,
	"entry_utm_campaign" text,
	"entry_utm_content" text,
	"entry_utm_term" text,
	"entry_landing_page" text,
	"entry_conversion_date" timestamp with time zone,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "imobiliarias_moskit_id_unique" UNIQUE("moskit_id")
);
--> statement-breakpoint
CREATE TABLE "inbound_origins" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inbound_origins_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "lead_origin_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"imobiliaria_id" integer NOT NULL,
	"marketing_channel_id" integer,
	"inbound_origin_id" integer,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"utm_content" text,
	"utm_term" text,
	"landing_page" text,
	"conversion_date" timestamp with time zone,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" "origin_source" NOT NULL,
	"is_entry" boolean DEFAULT false NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "marketing_channels" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_paid" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketing_channels_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "marketing_costs" (
	"id" serial PRIMARY KEY NOT NULL,
	"marketing_channel_id" integer NOT NULL,
	"campaign" text,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"amount_cents" bigint NOT NULL,
	"source" "cost_source" DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" serial PRIMARY KEY NOT NULL,
	"moskit_activity_id" text,
	"imobiliaria_id" integer,
	"sdr_id" integer,
	"scheduled_at" timestamp with time zone,
	"done_at" timestamp with time zone,
	"status" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meetings_moskit_activity_id_unique" UNIQUE("moskit_activity_id")
);
--> statement-breakpoint
CREATE TABLE "revenue_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"imobiliaria_id" integer NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"amount_cents" bigint NOT NULL,
	"kind" "revenue_kind" DEFAULT 'outro' NOT NULL,
	"ref_id" text,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text DEFAULT 'running' NOT NULL,
	"records_processed" integer DEFAULT 0 NOT NULL,
	"cursor" text,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"moskit_id" text,
	"name" text NOT NULL,
	"email" text,
	"role" "user_role" DEFAULT 'outro' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_moskit_id_unique" UNIQUE("moskit_id")
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"moskit_event_id" text,
	"type" text,
	"payload" jsonb,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"status" text DEFAULT 'received' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_imobiliaria_id_imobiliarias_id_fk" FOREIGN KEY ("imobiliaria_id") REFERENCES "public"."imobiliarias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garantias" ADD CONSTRAINT "garantias_imobiliaria_id_imobiliarias_id_fk" FOREIGN KEY ("imobiliaria_id") REFERENCES "public"."imobiliarias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garantias" ADD CONSTRAINT "garantias_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imobiliaria_stage_history" ADD CONSTRAINT "imobiliaria_stage_history_imobiliaria_id_imobiliarias_id_fk" FOREIGN KEY ("imobiliaria_id") REFERENCES "public"."imobiliarias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imobiliarias" ADD CONSTRAINT "imobiliarias_sdr_id_users_id_fk" FOREIGN KEY ("sdr_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imobiliarias" ADD CONSTRAINT "imobiliarias_gestor_id_users_id_fk" FOREIGN KEY ("gestor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imobiliarias" ADD CONSTRAINT "imobiliarias_entry_marketing_channel_id_marketing_channels_id_fk" FOREIGN KEY ("entry_marketing_channel_id") REFERENCES "public"."marketing_channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imobiliarias" ADD CONSTRAINT "imobiliarias_entry_inbound_origin_id_inbound_origins_id_fk" FOREIGN KEY ("entry_inbound_origin_id") REFERENCES "public"."inbound_origins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_origin_history" ADD CONSTRAINT "lead_origin_history_imobiliaria_id_imobiliarias_id_fk" FOREIGN KEY ("imobiliaria_id") REFERENCES "public"."imobiliarias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_origin_history" ADD CONSTRAINT "lead_origin_history_marketing_channel_id_marketing_channels_id_fk" FOREIGN KEY ("marketing_channel_id") REFERENCES "public"."marketing_channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_origin_history" ADD CONSTRAINT "lead_origin_history_inbound_origin_id_inbound_origins_id_fk" FOREIGN KEY ("inbound_origin_id") REFERENCES "public"."inbound_origins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_costs" ADD CONSTRAINT "marketing_costs_marketing_channel_id_marketing_channels_id_fk" FOREIGN KEY ("marketing_channel_id") REFERENCES "public"."marketing_channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_imobiliaria_id_imobiliarias_id_fk" FOREIGN KEY ("imobiliaria_id") REFERENCES "public"."imobiliarias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_sdr_id_users_id_fk" FOREIGN KEY ("sdr_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_events" ADD CONSTRAINT "revenue_events_imobiliaria_id_imobiliarias_id_fk" FOREIGN KEY ("imobiliaria_id") REFERENCES "public"."imobiliarias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contract_imob_idx" ON "contracts" USING btree ("imobiliaria_id");--> statement-breakpoint
CREATE INDEX "contract_signed_idx" ON "contracts" USING btree ("signed_at");--> statement-breakpoint
CREATE INDEX "garantia_imob_idx" ON "garantias" USING btree ("imobiliaria_id");--> statement-breakpoint
CREATE INDEX "garantia_contracted_idx" ON "garantias" USING btree ("contracted_at");--> statement-breakpoint
CREATE INDEX "ish_imob_idx" ON "imobiliaria_stage_history" USING btree ("imobiliaria_id");--> statement-breakpoint
CREATE INDEX "ish_imob_entered_idx" ON "imobiliaria_stage_history" USING btree ("imobiliaria_id","entered_at");--> statement-breakpoint
CREATE INDEX "imob_entry_mkt_idx" ON "imobiliarias" USING btree ("entry_marketing_channel_id");--> statement-breakpoint
CREATE INDEX "imob_entry_inbound_idx" ON "imobiliarias" USING btree ("entry_inbound_origin_id");--> statement-breakpoint
CREATE INDEX "imob_sdr_idx" ON "imobiliarias" USING btree ("sdr_id");--> statement-breakpoint
CREATE INDEX "imob_gestor_idx" ON "imobiliarias" USING btree ("gestor_id");--> statement-breakpoint
CREATE INDEX "imob_status_idx" ON "imobiliarias" USING btree ("status");--> statement-breakpoint
CREATE INDEX "imob_step_idx" ON "imobiliarias" USING btree ("funnel_step");--> statement-breakpoint
CREATE INDEX "imob_entered_idx" ON "imobiliarias" USING btree ("entered_at");--> statement-breakpoint
CREATE INDEX "loh_imob_idx" ON "lead_origin_history" USING btree ("imobiliaria_id");--> statement-breakpoint
CREATE INDEX "loh_imob_captured_idx" ON "lead_origin_history" USING btree ("imobiliaria_id","captured_at");--> statement-breakpoint
CREATE INDEX "cost_channel_idx" ON "marketing_costs" USING btree ("marketing_channel_id");--> statement-breakpoint
CREATE INDEX "cost_period_idx" ON "marketing_costs" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "meet_imob_idx" ON "meetings" USING btree ("imobiliaria_id");--> statement-breakpoint
CREATE INDEX "meet_sdr_idx" ON "meetings" USING btree ("sdr_id");--> statement-breakpoint
CREATE INDEX "meet_done_idx" ON "meetings" USING btree ("done_at");--> statement-breakpoint
CREATE INDEX "rev_imob_idx" ON "revenue_events" USING btree ("imobiliaria_id");--> statement-breakpoint
CREATE INDEX "rev_occurred_idx" ON "revenue_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "rev_kind_idx" ON "revenue_events" USING btree ("kind");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_event_uq" ON "webhook_events" USING btree ("moskit_event_id");