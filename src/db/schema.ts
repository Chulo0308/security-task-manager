import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  boolean,
  integer,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: varchar("role", { length: 50 }).notNull().default("guard"), // admin | supervisor | operator | guard
    title: varchar("title", { length: 200 }).notNull().default("Security Officer"),
    site: varchar("site", { length: 200 }).notNull().default("8 Bishopsgate"),
    phone: varchar("phone", { length: 50 }),
    active: boolean("active").notNull().default(true),
    lastSeenAt: timestamp("last_seen_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("users_email_idx").on(t.email)]
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 300 }).notNull(),
    description: text("description").notNull().default(""),
    priority: varchar("priority", { length: 20 }).notNull().default("medium"), // critical | high | medium | low
    status: varchar("status", { length: 30 }).notNull().default("open"), // open | in_progress | completed | cancelled
    category: varchar("category", { length: 60 }).notNull().default("general"), // patrol | access_control | cctv | incident | maintenance | training | compliance
    location: varchar("location", { length: 200 }),
    assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dueAt: timestamp("due_at"),
    completedAt: timestamp("completed_at"),
createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    overdueNotifiedAt: timestamp("overdue_notified_at"),
  },
  (t) => [
    index("tasks_status_idx").on(t.status),
    index("tasks_assigned_idx").on(t.assignedTo),
    index("tasks_priority_idx").on(t.priority),
  ]
);

export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 300 }).notNull(),
    body: text("body").notNull().default(""),
    priority: varchar("priority", { length: 20 }).notNull().default("normal"), // normal | urgent | critical
    pinned: boolean("pinned").notNull().default(false),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("announcements_created_idx").on(t.createdAt)]
);

export const siteSettings = pgTable("site_settings", {
  id: varchar("id", { length: 20 }).primaryKey().default("site"),
  siteName: varchar("site_name", { length: 200 }).notNull().default("8 Bishopsgate"),
  addressLine1: varchar("address_line1", { length: 255 }).notNull().default(""),
  addressLine2: varchar("address_line2", { length: 255 }),
  borough: varchar("borough", { length: 120 }),
  city: varchar("city", { length: 120 }),
  postcode: varchar("postcode", { length: 24 }),
  country: varchar("country", { length: 120 }),
  securityTier: varchar("security_tier", { length: 60 }),
  phone: varchar("phone", { length: 60 }),
  email: varchar("email", { length: 255 }),
  websiteUrl: varchar("website_url", { length: 500 }),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const floors = pgTable(
  "floors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    level: integer("level").notNull().default(0),
    notes: varchar("notes", { length: 255 }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("floors_sort_idx").on(t.sortOrder)]
);

export const todos = pgTable(
  "todos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 300 }).notNull(),
    done: boolean("done").notNull().default(false),
    dueAt: timestamp("due_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("todos_user_idx").on(t.userId)]
);

export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resourceType: varchar("resource_type", { length: 20 }).notNull(), // task | announcement
    resourceId: uuid("resource_id").notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 120 }).notNull(),
    size: integer("size").notNull().default(0),
    data: text("data").notNull(), // base64 payload
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("attachments_resource_idx").on(t.resourceType, t.resourceId),
  ]
);

export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resourceType: varchar("resource_type", { length: 20 }).notNull(), // task | announcement
    resourceId: uuid("resource_id").notNull(),
    resourceTitle: varchar("resource_title", { length: 300 }).notNull(),
    message: text("message").notNull().default(""),
    remindAt: timestamp("remind_at").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    notifiedAt: timestamp("notified_at"),
  },
  (t) => [
    index("reminders_resource_idx").on(t.resourceType, t.resourceId),
    index("reminders_time_idx").on(t.remindAt),
  ]
);

export const taskSeen = pgTable(
  "task_seen",
  {
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    seenAt: timestamp("seen_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.taskId, t.userId] }),
    index("task_seen_task_idx").on(t.taskId),
    index("task_seen_user_idx").on(t.userId),
  ]
);
export const taskAssignees = pgTable(
  "task_assignees",
  {
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.taskId, t.userId] }),
    index("task_assignees_task_idx").on(t.taskId),
    index("task_assignees_user_idx").on(t.userId),
  ]
);

export const announcementSeen = pgTable(
  "announcement_seen",
  {
    announcementId: uuid("announcement_id")
      .notNull()
      .references(() => announcements.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    seenAt: timestamp("seen_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.announcementId, t.userId] }),
    index("announcement_seen_announcement_idx").on(t.announcementId),
    index("announcement_seen_user_idx").on(t.userId),
  ]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Announcement = typeof announcements.$inferSelect;
export type NewAnnouncement = typeof announcements.$inferInsert;
export type TaskSeen = typeof taskSeen.$inferSelect;
export type AnnouncementSeen = typeof announcementSeen.$inferSelect;
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("push_subscriptions_user_idx").on(t.userId)]
);
export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 60 }).notNull(),
    resourceType: varchar("resource_type", { length: 30 }).notNull(),
    resourceId: uuid("resource_id"),
    resourceTitle: varchar("resource_title", { length: 300 }),
    details: text("details"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("activity_log_created_idx").on(t.createdAt),
    index("activity_log_actor_idx").on(t.actorId),
  ]
);