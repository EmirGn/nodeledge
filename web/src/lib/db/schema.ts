import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/* ——— Better Auth tables ——— */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ——— nodeledge tables ———
 * A topic is one user's private knownode graph (FORMAT.md manifest, in rows).
 * Node bodies are generated lazily and cached in topicNodes.content.
 */

export const topics = pgTable("topics", {
  id: text("id").primaryKey(), // url-safe random id
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  prompt: text("prompt").notNull(), // what the learner typed, verbatim
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const topicNodes = pgTable(
  "topic_nodes",
  {
    topicId: text("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    id: text("id").notNull(), // kebab-case node id, unique within topic
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    level: integer("level").notNull(),
    content: text("content"), // markdown body; null until first opened
  },
  (t) => [primaryKey({ columns: [t.topicId, t.id] })],
);

export const topicEdges = pgTable(
  "topic_edges",
  {
    topicId: text("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    target: text("target").notNull(),
    type: text("type", { enum: ["prerequisite", "related"] }).notNull(),
    weight: real("weight").notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.topicId, t.source, t.target, t.type] })],
);

export const knownNodes = pgTable(
  "known_nodes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    topicId: text("topic_id").notNull(), // also covers file-based demo topics
    nodeId: text("node_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.topicId, t.nodeId] })],
);
