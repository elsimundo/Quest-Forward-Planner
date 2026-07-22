import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// Only `users` exists in this slice — Auth.js needs it to authenticate against.
// The rest of SPEC.md §2's schema lands with the slice-2 migration — see docs/DATABASE.md.
export const ROLES = ["viewer", "scheduler", "admin", "super_admin"] as const;
export type Role = (typeof ROLES)[number];

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ROLES }).notNull().default("viewer"),
  tmsSyncedAt: timestamp("tms_synced_at", { withTimezone: true }),
});
