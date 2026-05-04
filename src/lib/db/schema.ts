import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const approvalStatus = pgEnum("approval_status", [
  "pending",
  "approved",
  "rejected",
]);

export const petKind = pgEnum("pet_kind", ["creature", "object", "character"]);

export const submittedPets = pgTable(
  "submitted_pets",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    displayName: text("display_name").notNull(),
    description: text("description").notNull(),
    spritesheetUrl: text("spritesheet_url").notNull(),
    petJsonUrl: text("pet_json_url").notNull(),
    zipUrl: text("zip_url").notNull(),
    kind: petKind("kind").notNull().default("creature"),
    vibes: jsonb("vibes").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    tags: jsonb("tags").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    featured: boolean("featured").notNull().default(false),
    // 64-bit dHash of the first idle frame as a 16-char hex string. Used
    // for fast perceptual-similarity dedup at admin review time.
    dhash: text("dhash"),
    // OpenAI text-embedding-3-small (1536 dims) over displayName +
    // description + tags. Drizzle has no first-class pgvector type yet,
    // so we keep it as `unknown` here and cast at the query boundary.
    // The actual column is declared via ALTER TABLE in scripts/.
    status: approvalStatus("status").notNull().default("pending"),
    ownerId: text("owner_id").notNull(),
    ownerEmail: text("owner_email"),
    creditName: text("credit_name"),
    creditUrl: text("credit_url"),
    creditImage: text("credit_image"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    // Owner-submitted text edits awaiting admin re-approval. Sprites/zip
    // are not editable here — those changes require a fresh /submit so
    // the dedup + virus-scan + dhash pipeline runs again. When all three
    // pendingX fields are null the pet has no edit in flight.
    pendingDisplayName: text("pending_display_name"),
    pendingDescription: text("pending_description"),
    pendingTags: jsonb("pending_tags").$type<string[] | null>(),
    pendingSubmittedAt: timestamp("pending_submitted_at", { withTimezone: true }),
    pendingRejectionReason: text("pending_rejection_reason"),
  },
  (table) => ({
    statusIdx: index("submitted_pets_status_idx").on(table.status),
    ownerIdx: index("submitted_pets_owner_idx").on(table.ownerId),
    slugUnique: uniqueIndex("submitted_pets_slug_unique").on(table.slug),
    statusFeaturedNameIdx: index("submitted_pets_status_featured_name_idx").on(
      table.status,
      table.featured,
      table.displayName,
    ),
    statusKindIdx: index("submitted_pets_status_kind_idx").on(
      table.status,
      table.kind,
    ),
    pendingEditIdx: index("submitted_pets_pending_edit_idx").on(
      table.pendingSubmittedAt,
    ),
    vibesGinIdx: index("submitted_pets_vibes_gin_idx")
      .using("gin", table.vibes),
    tagsGinIdx: index("submitted_pets_tags_gin_idx")
      .using("gin", table.tags),
  }),
);

export const petLikes = pgTable(
  "pet_likes",
  {
    userId: text("user_id").notNull(),
    petSlug: text("pet_slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.petSlug] }),
    slugIdx: index("pet_likes_slug_idx").on(table.petSlug),
  }),
);

export const petMetrics = pgTable("pet_metrics", {
  petSlug: text("pet_slug").primaryKey(),
  installCount: integer("install_count").notNull().default(0),
  zipDownloadCount: integer("zip_download_count").notNull().default(0),
  likeCount: integer("like_count").notNull().default(0),
  lastInstalledAt: timestamp("last_installed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const feedbackKind = pgEnum("feedback_kind", [
  "suggestion",
  "bug",
  "praise",
  "other",
]);

export const feedbackStatus = pgEnum("feedback_status", [
  "pending",
  "addressed",
  "archived",
]);

export const feedback = pgTable(
  "feedback",
  {
    id: text("id").primaryKey(),
    kind: feedbackKind("kind").notNull().default("suggestion"),
    status: feedbackStatus("status").notNull().default("pending"),
    message: text("message").notNull(),
    email: text("email"),
    pageUrl: text("page_url"),
    userAgent: text("user_agent"),
    userId: text("user_id"),
    addressedAt: timestamp("addressed_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    adminNote: text("admin_note"),
    // True = user opted in to email notifications when admin replies.
    // Defaults to true; user can mute from /my-feedback later.
    notifyEmail: boolean("notify_email").notNull().default(true),
    // Last time the original author saw the thread (used for unread counts).
    userLastReadAt: timestamp("user_last_read_at", { withTimezone: true }),
    // Last time admin saw the thread (so user follow-ups bell on admin side).
    adminLastReadAt: timestamp("admin_last_read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    createdAtIdx: index("feedback_created_at_idx").on(table.createdAt),
    userIdx: index("feedback_user_idx").on(table.userId),
    statusIdx: index("feedback_status_idx").on(table.status),
  }),
);

export const feedbackAuthorKind = pgEnum("feedback_author_kind", [
  "admin",
  "user",
]);

export const feedbackReplies = pgTable(
  "feedback_replies",
  {
    id: text("id").primaryKey(),
    feedbackId: text("feedback_id")
      .notNull()
      .references(() => feedback.id, { onDelete: "cascade" }),
    authorKind: feedbackAuthorKind("author_kind").notNull(),
    authorUserId: text("author_user_id"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    feedbackIdx: index("feedback_replies_feedback_idx").on(table.feedbackId),
    createdAtIdx: index("feedback_replies_created_at_idx").on(table.createdAt),
  }),
);

export const petRequests = pgTable(
  "pet_requests",
  {
    id: text("id").primaryKey(),
    // What the user typed verbatim (preserved for display).
    query: text("query").notNull(),
    // Lowercased + collapsed-whitespace key for dedup look-ups.
    normalized: text("normalized").notNull(),
    // OpenAI embedding lives in a pgvector column added via raw SQL.
    requestedBy: text("requested_by"),
    upvoteCount: integer("upvote_count").notNull().default(1),
    // open / fulfilled / dismissed
    status: text("status").notNull().default("open"),
    fulfilledPetSlug: text("fulfilled_pet_slug"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    normalizedIdx: index("pet_requests_normalized_idx").on(table.normalized),
    upvoteIdx: index("pet_requests_upvote_idx").on(table.upvoteCount),
    statusIdx: index("pet_requests_status_idx").on(table.status),
  }),
);

export const petRequestVotes = pgTable(
  "pet_request_votes",
  {
    requestId: text("request_id").notNull(),
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.requestId, table.userId] }),
  }),
);

export type SubmittedPet = typeof submittedPets.$inferSelect;
export type NewSubmittedPet = typeof submittedPets.$inferInsert;
export type PetLike = typeof petLikes.$inferSelect;
export type PetMetric = typeof petMetrics.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type PetRequest = typeof petRequests.$inferSelect;
