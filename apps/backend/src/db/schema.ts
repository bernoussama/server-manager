import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { ticketPriorityEnum, ticketStatusEnum } from "@server-manager/shared";

export const users = sqliteTable("users", {
  id: int("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isAdmin: int("is_admin", { mode: 'boolean' }).notNull().default(false),
  createdAt: int("created_at", { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: int("updated_at", { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const tickets = sqliteTable("tickets", {
    id: int("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    status: text('status', { enum: ticketStatusEnum }).notNull().default('open'),
    priority: text('priority', { enum: ticketPriorityEnum }).notNull().default('medium'),
    userId: int("user_id").notNull().references(() => users.id),
    assigneeId: int("assignee_id").references(() => users.id),
    createdAt: int("created_at", { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: int("updated_at", { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const usersRelations = relations(users, ({ many }) => ({
	createdTickets: many(tickets, {
		relationName: 'ticketCreator',
	}),
	assignedTickets: many(tickets, {
		relationName: 'ticketAssignee',
	}),
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
	creator: one(users, {
		fields: [tickets.userId],
		references: [users.id],
		relationName: 'ticketCreator',
	}),
	assignee: one(users, {
		fields: [tickets.assigneeId],
		references: [users.id],
		relationName: 'ticketAssignee',
	}),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
