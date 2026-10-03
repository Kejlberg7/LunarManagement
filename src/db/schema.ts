import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { PushSubscription } from "web-push";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    name: text("name"),
    passwordHash: text("password_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const loginTokens = pgTable(
  "login_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("login_tokens_hash_unique").on(table.tokenHash)],
);

export const teams = pgTable("teams", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  rankedInId: text("rankedin_id").notNull(),
  pool: text("pool").notNull(),
  homeVenue: text("home_venue").notNull(),
  homeAddress: text("home_address").notNull(),
  rankedInUrl: text("rankedin_url").notNull(),
  sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
}, (table) => [uniqueIndex("teams_rankedin_id_unique").on(table.rankedInId)]);

export const seasons = pgTable("seasons", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  year: integer("year").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
}, (table) => [uniqueIndex("seasons_team_year_name_unique").on(table.teamId, table.year, table.name)]);

export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    email: text("email"),
    name: text("name").notNull(),
    rankedInId: text("rankedin_id"),
    role: text("role").default("player").notNull(),
    rank: integer("rank"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("team_members_team_idx").on(table.teamId),
    index("team_members_user_idx").on(table.userId),
    uniqueIndex("team_members_rankedin_unique").on(table.teamId, table.rankedInId),
  ],
);

export const teamAccess = pgTable(
  "team_access",
  {
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    role: text("role").default("player").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.teamId, table.userId] })],
);

export const fixtures = pgTable(
  "fixtures",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    seasonId: uuid("season_id").references(() => seasons.id, { onDelete: "cascade" }).notNull(),
    opponent: text("opponent").notNull(),
    homeAway: text("home_away").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    venue: text("venue"),
    address: text("address"),
    rankedInUrl: text("rankedin_url"),
    rankedInMatchId: text("rankedin_match_id"),
    status: text("status").default("scheduled").notNull(),
    result: text("result"),
    sourceType: text("source_type").default("manual").notNull(),
    sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("fixtures_season_date_idx").on(table.seasonId, table.scheduledAt),
    uniqueIndex("fixtures_rankedin_match_unique").on(table.rankedInMatchId),
  ],
);

export const recurringAvailability = pgTable("recurring_availability", {
  id: uuid("id").defaultRandom().primaryKey(),
  memberId: uuid("member_id").references(() => teamMembers.id, { onDelete: "cascade" }).notNull(),
  weekday: integer("weekday").notNull(),
  startsAt: text("starts_at").notNull(),
  endsAt: text("ends_at").notNull(),
  active: boolean("active").default(true).notNull(),
});

export const availabilityOptions = pgTable("availability_options", {
  id: uuid("id").defaultRandom().primaryKey(),
  fixtureId: uuid("fixture_id").references(() => fixtures.id, { onDelete: "cascade" }).notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const availabilityResponses = pgTable(
  "availability_responses",
  {
    optionId: uuid("option_id").references(() => availabilityOptions.id, { onDelete: "cascade" }).notNull(),
    memberId: uuid("member_id").references(() => teamMembers.id, { onDelete: "cascade" }).notNull(),
    response: text("response").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.optionId, table.memberId] })],
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    endpoint: text("endpoint").notNull(),
    subscription: jsonb("subscription").$type<PushSubscription>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("push_endpoint_unique").on(table.endpoint)],
);

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  fixtureId: uuid("fixture_id").references(() => fixtures.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  href: text("href").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
