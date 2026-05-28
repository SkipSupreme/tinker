CREATE TABLE `fsrs_card` (
	`user_id` text NOT NULL,
	`step_id` text NOT NULL,
	`lesson_slug` text NOT NULL,
	`module_slug` text NOT NULL,
	`knowledge_type` text,
	`due` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`stability` real NOT NULL,
	`difficulty` real NOT NULL,
	`elapsed_days` real DEFAULT 0 NOT NULL,
	`scheduled_days` real DEFAULT 0 NOT NULL,
	`reps` integer DEFAULT 0 NOT NULL,
	`lapses` integer DEFAULT 0 NOT NULL,
	`state` integer DEFAULT 0 NOT NULL,
	`last_review` integer,
	PRIMARY KEY(`user_id`, `step_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `fsrs_card_by_user_module_due` ON `fsrs_card` (`user_id`,`module_slug`,`due`);--> statement-breakpoint
CREATE TABLE `key_idea` (
	`user_id` text NOT NULL,
	`module_slug` text NOT NULL,
	`text` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `module_slug`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `step_check` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`lesson_slug` text NOT NULL,
	`step_id` text NOT NULL,
	`answer_json` text NOT NULL,
	`is_correct` integer NOT NULL,
	`rating` text,
	`attempt_no` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `step_check_by_user_step` ON `step_check` (`user_id`,`step_id`);--> statement-breakpoint
CREATE INDEX `step_check_by_user_lesson` ON `step_check` (`user_id`,`lesson_slug`);--> statement-breakpoint
CREATE TABLE `step_id_alias` (
	`old_step_id` text PRIMARY KEY NOT NULL,
	`new_step_id` text NOT NULL,
	`renamed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `streak_state` (
	`user_id` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`current` integer DEFAULT 0 NOT NULL,
	`longest` integer DEFAULT 0 NOT NULL,
	`last_active_day` text,
	`timezone` text DEFAULT 'UTC' NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
