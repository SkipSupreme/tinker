-- Align `rate_limit` to Better Auth's expected shape.
-- Better Auth 1.6's rate-limiter stores rows as {id, key, count, lastRequest};
-- our table previously had {key (PK), count, resetAt}, which caused the
-- drizzle adapter to throw "field 'id' does not exist" on every increment
-- and forced the auth code to fall back to per-isolate memory storage
-- (defeats rate limiting across Cloudflare edge regions). The app-level
-- limiter in src/server/ratelimit.ts shares this table and now generates
-- its own id via crypto.randomUUID. rate_limit holds purely ephemeral
-- counter state, so dropping and recreating it loses nothing of value.
DROP TABLE IF EXISTS `rate_limit`;
--> statement-breakpoint
CREATE TABLE `rate_limit` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`count` integer NOT NULL,
	`last_request` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rate_limit_key_unique` ON `rate_limit` (`key`);
