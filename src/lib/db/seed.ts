/**
 * Seed script — populates the database with initial data.
 *
 * Usage (local):  DATABASE_URL=file:./ngasir.db npx tsx src/lib/db/seed.ts
 * Usage (turso):  DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=... npx tsx src/lib/db/seed.ts
 *
 * Or just run: npm run db:seed
 */
import "dotenv/config";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { product, order, orderItem } from "./schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;
const DATABASE_AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN;

if (!DATABASE_URL) {
  console.error("❌ Missing DATABASE_URL environment variable.");
  process.exit(1);
}

const client = createClient({
  url: DATABASE_URL,
  authToken: DATABASE_AUTH_TOKEN,
});

const db = drizzle(client, { schema });

// Create auth instance for user creation
const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite" }),
  emailAndPassword: { enabled: true },
});

// ────────────────────────────────────────
// Products
// ────────────────────────────────────────
const PRODUCTS = [
  { id: "p1",  name: "Indomie Goreng",   price: 3500,  stock: 48, category: "Makanan" },
  { id: "p2",  name: "Aqua 600ml",       price: 4000,  stock: 35, category: "Minuman" },
  { id: "p3",  name: "Teh Botol Sosro",  price: 5000,  stock: 22, category: "Minuman" },
  { id: "p4",  name: "Minyak Goreng 1L", price: 18000, stock: 8,  category: "Kebutuhan" },
  { id: "p5",  name: "Beras 5kg",        price: 65000, stock: 4,  category: "Kebutuhan" },
  { id: "p6",  name: "Gula Pasir 1kg",   price: 15000, stock: 12, category: "Kebutuhan" },
  { id: "p7",  name: "Sabun Lifebuoy",   price: 3500,  stock: 3,  category: "Perlengkapan" },
  { id: "p8",  name: "Kopi Kapal Api",   price: 2000,  stock: 56, category: "Minuman" },
  { id: "p9",  name: "Rokok GG Filter",  price: 28000, stock: 15, category: "Lainnya" },
  { id: "p10", name: "Pop Mie",          price: 5500,  stock: 6,  category: "Makanan" },
  { id: "p11", name: "Susu Ultra 250ml", price: 6000,  stock: 18, category: "Minuman" },
  { id: "p12", name: "Telur 1kg",        price: 27000, stock: 7,  category: "Kebutuhan" },
  { id: "p13", name: "Shampo Sunsilk",   price: 1500,  stock: 2,  category: "Perlengkapan" },
  { id: "p14", name: "Rinso 900g",       price: 12000, stock: 9,  category: "Perlengkapan" },
  { id: "p15", name: "Chitato 68g",      price: 10000, stock: 14, category: "Makanan" },
];

// ────────────────────────────────────────
// Sample orders
// cashAmount: diisi untuk CASH, null untuk QRIS
// ────────────────────────────────────────
const ORDERS = [
  {
    totalAmount: 52500,
    paymentMethod: "CASH",
    cashAmount: 55000,   // kembalian 2.500
    status: "PAID",
    minutesAgo: 120,
    items: [
      { productId: "p1", quantity: 3, priceAtSale: 3500 },
      { productId: "p2", quantity: 2, priceAtSale: 4000 },
      { productId: "p7", quantity: 1, priceAtSale: 3500 },
      { productId: "p8", quantity: 2, priceAtSale: 2000 },
    ],
  },
  {
    totalAmount: 128000,
    paymentMethod: "QRIS",
    cashAmount: null,
    status: "PAID",
    minutesAgo: 135,
    items: [
      { productId: "p4", quantity: 2, priceAtSale: 18000 },
      { productId: "p6", quantity: 3, priceAtSale: 15000 },
      { productId: "p5", quantity: 1, priceAtSale: 65000 },
    ],
  },
  {
    totalAmount: 34000,
    paymentMethod: "CASH",
    cashAmount: 35000,   // kembalian 1.000
    status: "PAID",
    minutesAgo: 155,
    items: [
      { productId: "p3",  quantity: 3, priceAtSale: 5000 },
      { productId: "p10", quantity: 2, priceAtSale: 5500 },
      { productId: "p8",  quantity: 2, priceAtSale: 2000 },
    ],
  },
  {
    totalAmount: 95000,
    paymentMethod: "QRIS",
    cashAmount: null,
    status: "PAID",
    minutesAgo: 180,
    items: [
      { productId: "p9",  quantity: 2, priceAtSale: 28000 },
      { productId: "p15", quantity: 3, priceAtSale: 10000 },
      { productId: "p2",  quantity: 1, priceAtSale: 4000  },
    ],
  },
  {
    totalAmount: 17500,
    paymentMethod: "CASH",
    cashAmount: 20000,   // kembalian 2.500
    status: "PAID",
    minutesAgo: 210,
    items: [
      { productId: "p13", quantity: 3, priceAtSale: 1500 },
      { productId: "p8",  quantity: 5, priceAtSale: 2000 },
    ],
  },
  {
    totalAmount: 65000,
    paymentMethod: "QRIS",
    cashAmount: null,
    status: "PAID",
    minutesAgo: 250,
    items: [{ productId: "p5", quantity: 1, priceAtSale: 65000 }],
  },
  {
    totalAmount: 44000,
    paymentMethod: "CASH",
    cashAmount: 50000,   // kembalian 6.000
    status: "PAID",
    minutesAgo: 280,
    items: [
      { productId: "p11", quantity: 3, priceAtSale: 6000 },
      { productId: "p1",  quantity: 5, priceAtSale: 3500 },
      { productId: "p2",  quantity: 1, priceAtSale: 4000 },
    ],
  },
  {
    totalAmount: 56000,
    paymentMethod: "CASH",
    cashAmount: 60000,   // kembalian 4.000
    status: "PAID",
    minutesAgo: 300,
    items: [
      { productId: "p14", quantity: 2, priceAtSale: 12000 },
      { productId: "p12", quantity: 1, priceAtSale: 27000 },
      { productId: "p8",  quantity: 1, priceAtSale: 2000  },
    ],
  },
  {
    totalAmount: 33500,
    paymentMethod: "QRIS",
    cashAmount: null,
    status: "PAID",
    minutesAgo: 340,
    items: [
      { productId: "p10", quantity: 3, priceAtSale: 5500  },
      { productId: "p3",  quantity: 2, priceAtSale: 5000  },
      { productId: "p15", quantity: 1, priceAtSale: 10000 },
    ],
  },
  {
    totalAmount: 49000,
    paymentMethod: "CASH",
    cashAmount: 50000,   // kembalian 1.000
    status: "PAID",
    minutesAgo: 380,
    items: [
      { productId: "p9", quantity: 1, priceAtSale: 28000 },
      { productId: "p2", quantity: 3, priceAtSale: 4000  },
      { productId: "p8", quantity: 2, priceAtSale: 2000  },
    ],
  },
];

/**
 * Generate readable order ID: TRX-YYYYMMDD-NNNN
 */
function makeOrderId(date: Date, seq: number): string {
  const y = String(date.getFullYear());
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `TRX-${y}${m}${d}-${String(seq).padStart(4, "0")}`;
}

async function seed() {
  console.log("🌱 Seeding database...\n");
  console.log(`📡 Target: ${DATABASE_URL}\n`);

  // 0. Clear old data (keep users/sessions)
  console.log("🗑️  Clearing old orders & products...");
  await db.delete(orderItem);
  await db.delete(order);
  await db.delete(product);
  console.log("   ✅ Cleared.\n");

  // 1. Create admin user
  console.log("👤 Creating admin user...");
  try {
    const signUpResponse = await auth.api.signUpEmail({
      body: {
        name: "Ahmad",
        email: "admin@ngasir.id",
        password: "admin123",
      },
    });
    console.log("   ✅ Admin user created:", signUpResponse.user?.email);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (errorMessage.includes("already exists") || errorMessage.includes("UNIQUE")) {
      console.log("   ⚠️  Admin user already exists, skipping.");
    } else {
      console.error("   ❌ Error creating user:", errorMessage);
    }
  }

  // Get the user ID
  const [adminUser] = await db.select().from(schema.user).limit(1);

  // 2. Insert products
  console.log("\n📦 Inserting products...");
  for (const p of PRODUCTS) {
    await db.insert(product).values(p).onConflictDoNothing();
  }
  console.log(`   ✅ ${PRODUCTS.length} products inserted.`);

  // 3. Insert orders + items
  console.log("\n🧾 Inserting sample orders...");
  const now = new Date();
  const dateCounters: Record<string, number> = {};

  for (const o of ORDERS) {
    const orderDate = new Date(now.getTime() - o.minutesAgo * 60 * 1000);
    const createdAt = orderDate.toISOString().replace("T", " ").slice(0, 19);

    const dateKey =
      String(orderDate.getFullYear()) +
      String(orderDate.getMonth() + 1).padStart(2, "0") +
      String(orderDate.getDate()).padStart(2, "0");
    dateCounters[dateKey] = (dateCounters[dateKey] || 0) + 1;
    const orderId = makeOrderId(orderDate, dateCounters[dateKey]);

    await db
      .insert(order)
      .values({
        id: orderId,
        totalAmount: o.totalAmount,
        paymentMethod: o.paymentMethod,
        cashAmount: o.cashAmount,
        status: o.status,
        createdAt,
        userId: adminUser?.id,
      })
      .onConflictDoNothing();

    for (const item of o.items) {
      await db
        .insert(orderItem)
        .values({
          orderId,
          productId: item.productId,
          quantity: item.quantity,
          priceAtSale: item.priceAtSale,
        })
        .onConflictDoNothing();
    }

    const info =
      o.cashAmount !== null
        ? `kembalian Rp ${(o.cashAmount - o.totalAmount).toLocaleString("id-ID")}`
        : "via QRIS";
    console.log(
      `   📝 ${orderId} — Rp ${o.totalAmount.toLocaleString("id-ID")} (${o.paymentMethod}, ${info})`
    );
  }
  console.log(`\n   ✅ ${ORDERS.length} orders inserted.`);

  console.log("\n✨ Seeding complete!\n");
  console.log("Demo credentials:");
  console.log("  Email:    admin@ngasir.id");
  console.log("  Password: admin123");

  client.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  client.close();
  process.exit(1);
});
