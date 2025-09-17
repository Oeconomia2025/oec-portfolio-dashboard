CREATE TABLE "portfolios" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" varchar NOT NULL,
	"net_worth" numeric(20, 8) DEFAULT '0' NOT NULL,
	"pnl" numeric(20, 8) DEFAULT '0' NOT NULL,
	"pnl_percentage" numeric(10, 4) DEFAULT '0' NOT NULL,
	"total_trades" integer DEFAULT 0 NOT NULL,
	"health_score" text DEFAULT 'Unknown' NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "portfolios_wallet_id_unique" UNIQUE("wallet_id")
);
--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_id" varchar NOT NULL,
	"price" numeric(20, 8) NOT NULL,
	"market_cap" numeric(30, 8),
	"volume_24h" numeric(30, 8),
	"timestamp" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "price_history_token_timestamp_unique" UNIQUE("token_id","timestamp")
);
--> statement-breakpoint
CREATE TABLE "staking_positions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" varchar NOT NULL,
	"token_id" varchar NOT NULL,
	"pool_name" text NOT NULL,
	"staking_type" text NOT NULL,
	"staked_amount" numeric(30, 18) DEFAULT '0' NOT NULL,
	"rewards_earned" numeric(30, 18) DEFAULT '0' NOT NULL,
	"unclaimed_rewards" numeric(30, 18) DEFAULT '0' NOT NULL,
	"apy" numeric(10, 4) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "token_balances" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" varchar NOT NULL,
	"token_id" varchar NOT NULL,
	"balance" numeric(30, 18) DEFAULT '0' NOT NULL,
	"usd_value" numeric(20, 8) DEFAULT '0' NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "token_balances_wallet_token_unique" UNIQUE("wallet_id","token_id")
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol" text NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"decimals" integer DEFAULT 18 NOT NULL,
	"logo_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tokens_symbol_unique" UNIQUE("symbol")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" varchar NOT NULL,
	"tx_hash" text NOT NULL,
	"type" text NOT NULL,
	"token_id" varchar NOT NULL,
	"amount" numeric(30, 18) NOT NULL,
	"usd_value" numeric(20, 8),
	"gas_used" numeric(20, 0),
	"gas_price" numeric(20, 0),
	"block_number" integer,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"metadata" jsonb,
	"timestamp" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_tx_hash_unique" UNIQUE("tx_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"address" text NOT NULL,
	"network" text DEFAULT 'ethereum' NOT NULL,
	"is_connected" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wallets_address_unique" UNIQUE("address")
);
--> statement-breakpoint
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staking_positions" ADD CONSTRAINT "staking_positions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staking_positions" ADD CONSTRAINT "staking_positions_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_balances" ADD CONSTRAINT "token_balances_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_balances" ADD CONSTRAINT "token_balances_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "price_history_token_id_idx" ON "price_history" USING btree ("token_id");--> statement-breakpoint
CREATE INDEX "price_history_timestamp_idx" ON "price_history" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "staking_positions_wallet_id_idx" ON "staking_positions" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "staking_positions_token_id_idx" ON "staking_positions" USING btree ("token_id");--> statement-breakpoint
CREATE INDEX "staking_positions_is_active_idx" ON "staking_positions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "token_balances_wallet_id_idx" ON "token_balances" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "token_balances_token_id_idx" ON "token_balances" USING btree ("token_id");--> statement-breakpoint
CREATE INDEX "tokens_symbol_idx" ON "tokens" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "tokens_address_idx" ON "tokens" USING btree ("address");--> statement-breakpoint
CREATE INDEX "transactions_wallet_id_idx" ON "transactions" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "transactions_token_id_idx" ON "transactions" USING btree ("token_id");--> statement-breakpoint
CREATE INDEX "transactions_tx_hash_idx" ON "transactions" USING btree ("tx_hash");--> statement-breakpoint
CREATE INDEX "transactions_timestamp_idx" ON "transactions" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "transactions_status_idx" ON "transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "wallets_user_id_idx" ON "wallets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "wallets_address_idx" ON "wallets" USING btree ("address");