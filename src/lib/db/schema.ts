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

export type SubmittedPet = typeof submittedPets.$inferSelect;
export type NewSubmittedPet = typeof submittedPets.$inferInsert;
export type PetLike = typeof petLikes.$inferSelect;
export type PetMetric = typeof petMetrics.$inferSelect;
