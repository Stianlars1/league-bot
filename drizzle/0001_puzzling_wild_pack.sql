CREATE TABLE "champion_build_aggregates" (
	"champion_id" text NOT NULL,
	"position" text NOT NULL,
	"patch" text NOT NULL,
	"build_signature" text NOT NULL,
	"build_items" jsonb NOT NULL,
	"sample_size" integer NOT NULL,
	"win_rate" real NOT NULL,
	"pacing" jsonb NOT NULL,
	"refreshed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "champion_build_aggregates_champion_id_position_patch_build_signature_pk" PRIMARY KEY("champion_id","position","patch","build_signature")
);
--> statement-breakpoint
CREATE TABLE "ingest_state" (
	"region" text NOT NULL,
	"patch" text NOT NULL,
	"cursor" text,
	"matches_ingested" integer DEFAULT 0 NOT NULL,
	"last_run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	CONSTRAINT "ingest_state_region_patch_pk" PRIMARY KEY("region","patch")
);
--> statement-breakpoint
CREATE TABLE "match_player_builds" (
	"match_id" text NOT NULL,
	"champion_id" text NOT NULL,
	"position" text NOT NULL,
	"patch" text NOT NULL,
	"region" text NOT NULL,
	"win" integer NOT NULL,
	"final_build" jsonb NOT NULL,
	"build_order" jsonb NOT NULL,
	"enemy_comp" jsonb NOT NULL,
	"game_length_seconds" integer NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_player_builds_match_id_champion_id_position_pk" PRIMARY KEY("match_id","champion_id","position")
);
--> statement-breakpoint
CREATE INDEX "idx_cba_champ_pos_patch_winrate" ON "champion_build_aggregates" USING btree ("champion_id","position","patch","win_rate");--> statement-breakpoint
CREATE INDEX "idx_mpb_champ_pos_patch" ON "match_player_builds" USING btree ("champion_id","position","patch");--> statement-breakpoint
CREATE INDEX "idx_mpb_patch_region" ON "match_player_builds" USING btree ("patch","region");