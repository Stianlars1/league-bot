CREATE TABLE "characters" (
	"game_id" text NOT NULL,
	"character_id" text NOT NULL,
	"name" text NOT NULL,
	"image_url" text,
	"tags" text[],
	"damage_type" text,
	"archetype" text,
	"raw" jsonb,
	"version" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "characters_game_id_character_id_pk" PRIMARY KEY("game_id","character_id")
);
--> statement-breakpoint
CREATE TABLE "match_cache" (
	"game_id" text NOT NULL,
	"external_id" text NOT NULL,
	"payload" jsonb,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_cache_game_id_external_id_pk" PRIMARY KEY("game_id","external_id")
);
--> statement-breakpoint
CREATE TABLE "players" (
	"game_id" text NOT NULL,
	"external_id" text NOT NULL,
	"display_name" text,
	"region" text,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "players_game_id_external_id_pk" PRIMARY KEY("game_id","external_id")
);
