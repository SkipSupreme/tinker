CREATE TABLE `placement` (
	`user_id` text NOT NULL,
	`course_slug` text NOT NULL,
	`entry_module` text NOT NULL,
	`entry_level` text NOT NULL,
	`strand_scores` text NOT NULL,
	`items_answered` integer NOT NULL,
	`taken_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `course_slug`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
