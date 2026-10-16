import { pgTable, text, integer, index, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ════════════════════════════════════════
// Better Auth tables (auto-generated for PostgreSQL)
// ════════════════════════════════════════

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// Auth relations
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// ════════════════════════════════════════
// Application tables
// ════════════════════════════════════════

// ────────────────────────────────────────
// Product table — catalog of items for sale
// ────────────────────────────────────────
export const product = pgTable("product", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  price: integer("price").notNull(), // in IDR (Rupiah), no decimals
  stock: integer("stock").notNull().default(0),
  category: text("category").notNull().default("Lainnya"),
  image: text("image"),
  barcode: text("barcode"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')`),
});

// ────────────────────────────────────────
// Order table — transaction header
// ────────────────────────────────────────
export const order = pgTable("order", {
  id: text("id").primaryKey(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')`),
  totalAmount: integer("total_amount").notNull(),
  paymentMethod: text("payment_method").notNull().default("CASH"), // "CASH" | "QRIS"
  cashAmount: integer("cash_amount"), // uang tunai yang diterima (null untuk QRIS)
  status: text("status").notNull().default("PAID"), // "PAID" | "PENDING"
  userId: text("user_id").references(() => user.id),
});

// ────────────────────────────────────────
// OrderItem table — line items per order
// ────────────────────────────────────────
export const orderItem = pgTable("order_item", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orderId: text("order_id")
    .notNull()
    .references(() => order.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => product.id),
  quantity: integer("quantity").notNull(),
  priceAtSale: integer("price_at_sale").notNull(), // snapshot of price at purchase time
});

// App relations
export const orderRelations = relations(order, ({ many, one }) => ({
  items: many(orderItem),
  user: one(user, {
    fields: [order.userId],
    references: [user.id],
  }),
}));

export const orderItemRelations = relations(orderItem, ({ one }) => ({
  order: one(order, {
    fields: [orderItem.orderId],
    references: [order.id],
  }),
  product: one(product, {
    fields: [orderItem.productId],
    references: [product.id],
  }),
}));

export const productRelations = relations(product, ({ many }) => ({
  orderItems: many(orderItem),
}));
