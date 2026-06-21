CREATE TABLE "hist_cadastros" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text,
	"imobiliaria" text,
	"origem" text,
	"bdr" text,
	"am_responsavel" text,
	"data_reuniao" date,
	"cadastrou" text,
	"data_cadastro" date,
	"link" text
);
--> statement-breakpoint
CREATE TABLE "hist_faturamento" (
	"id" serial PRIMARY KEY NOT NULL,
	"n_proposta" text,
	"imobiliaria" text,
	"valor_cents" bigint,
	"status" text,
	"data_envio" date,
	"data_atualizacao" date,
	"origem_imob" text,
	"regional" text,
	"url" text
);
--> statement-breakpoint
CREATE TABLE "hist_reunioes" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text,
	"imobiliaria" text,
	"origem" text,
	"realizou" text,
	"responsavel" text,
	"am_responsavel" text,
	"data_agendamento" date,
	"data_reuniao" date,
	"link" text,
	"fonte" text
);
--> statement-breakpoint
CREATE INDEX "hc_data_idx" ON "hist_cadastros" USING btree ("data_cadastro");--> statement-breakpoint
CREATE INDEX "hc_origem_idx" ON "hist_cadastros" USING btree ("origem");--> statement-breakpoint
CREATE INDEX "hf_envio_idx" ON "hist_faturamento" USING btree ("data_envio");--> statement-breakpoint
CREATE INDEX "hf_status_idx" ON "hist_faturamento" USING btree ("status");--> statement-breakpoint
CREATE INDEX "hr_data_idx" ON "hist_reunioes" USING btree ("data_reuniao");--> statement-breakpoint
CREATE INDEX "hr_realizou_idx" ON "hist_reunioes" USING btree ("realizou");--> statement-breakpoint
CREATE INDEX "hr_origem_idx" ON "hist_reunioes" USING btree ("origem");