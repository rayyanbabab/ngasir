import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { order, orderItem, product } from "@/lib/db/schema";
import { eq, like, and, desc, sql, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

/**
 * Generate a human-readable order ID: TRX-YYYYMMDD-NNNN
 * using WIB (UTC+7) timezone.
 */
async function generateOrderId(): Promise<string> {
  const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
  const nowWIB = new Date(Date.now() + WIB_OFFSET_MS);
  const dateStr =
    String(nowWIB.getUTCFullYear()) +
    String(nowWIB.getUTCMonth() + 1).padStart(2, "0") +
    String(nowWIB.getUTCDate()).padStart(2, "0");

  const prefix = `TRX-${dateStr}-`;

  const todayOrders = await db
    .select({ id: order.id })
    .from(order)
    .where(like(order.id, `${prefix}%`));

  let maxNum = 0;
  for (const o of todayOrders) {
    const suffix = o.id.replace(prefix, "");
    const num = parseInt(suffix, 10);
    if (!isNaN(num) && num > maxNum) maxNum = num;
  }

  return `${prefix}${String(maxNum + 1).padStart(4, "0")}`;
}

// GET /api/orders — list all orders with items (batch-optimized)
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const status = searchParams.get("status");
  const method = searchParams.get("method");

  const conditions = [];
  if (search) {
    conditions.push(like(order.id, `%${search}%`));
  }
  if (status && status !== "Semua") {
    conditions.push(eq(order.status, status));
  }
  if (method && method !== "Semua") {
    conditions.push(eq(order.paymentMethod, method));
  }

  const orders =
    conditions.length > 0
      ? await db
          .select()
          .from(order)
          .where(and(...conditions))
          .orderBy(desc(order.createdAt))
      : await db.select().from(order).orderBy(desc(order.createdAt));

  const orderIds = orders.map((o) => o.id);

  if (orderIds.length === 0) {
    return NextResponse.json([]);
  }

  // Batch-fetch all items for all matching orders in 1 query
  const allItems = await db
    .select({
      id: orderItem.id,
      orderId: orderItem.orderId,
      productId: orderItem.productId,
      quantity: orderItem.quantity,
      priceAtSale: orderItem.priceAtSale,
      name: product.name,
    })
    .from(orderItem)
    .leftJoin(product, eq(orderItem.productId, product.id))
    .where(inArray(orderItem.orderId, orderIds));

  // Group items by orderId
  const itemsByOrder = new Map<
    string,
    Array<{ name: string; qty: number; price: number }>
  >();

  for (const item of allItems) {
    const list = itemsByOrder.get(item.orderId) || [];
    list.push({
      name: item.name || "Produk dihapus",
      qty: item.quantity,
      price: item.priceAtSale,
    });
    itemsByOrder.set(item.orderId, list);
  }

  const ordersWithItems = orders.map((o) => {
    const items = itemsByOrder.get(o.id) || [];
    return {
      ...o,
      itemCount: items.reduce((sum, i) => sum + i.qty, 0),
      items,
    };
  });

  return NextResponse.json(ordersWithItems);
}

// POST /api/orders — create a new order (checkout)
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { items, paymentMethod = "CASH", cashAmount } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Items wajib diisi" }, { status: 400 });
    }

    // ── Step 1: Validate stock & fetch product details ──
    const productIds = items.map((i: { productId: string }) => i.productId);
    const existingProducts = await db
      .select()
      .from(product)
      .where(inArray(product.id, productIds));

    const productMap = new Map(existingProducts.map((p) => [p.id, p]));

    let totalAmount = 0;
    const orderItems: Array<{
      productId: string;
      name: string;
      quantity: number;
      priceAtSale: number;
    }> = [];

    for (const item of items) {
      const p = productMap.get(item.productId);

      if (!p) {
        return NextResponse.json(
          { error: `Produk ${item.productId} tidak ditemukan` },
          { status: 404 }
        );
      }

      if (p.stock < item.quantity) {
        return NextResponse.json(
          { error: `Stok ${p.name} tidak mencukupi (sisa: ${p.stock})` },
          { status: 400 }
        );
      }

      totalAmount += p.price * item.quantity;
      orderItems.push({
        productId: item.productId,
        name: p.name,
        quantity: item.quantity,
        priceAtSale: p.price,
      });
    }

    // ── Step 2: Generate unique order ID ──
    const orderId = await generateOrderId();

    // ── Step 3: Insert order ──
    const [newOrder] = await db
      .insert(order)
      .values({
        id: orderId,
        totalAmount,
        paymentMethod,
        cashAmount: paymentMethod === "CASH" ? (cashAmount ?? null) : null,
        status: "PAID",
        userId: session.user.id,
      })
      .returning();

    // ── Step 4: Insert order items & decrement stock ──
    for (const oi of orderItems) {
      await db.insert(orderItem).values({
        orderId: newOrder.id,
        productId: oi.productId,
        quantity: oi.quantity,
        priceAtSale: oi.priceAtSale,
      });

      await db
        .update(product)
        .set({ stock: sql`${product.stock} - ${oi.quantity}` })
        .where(eq(product.id, oi.productId));
    }

    return NextResponse.json(
      {
        ...newOrder,
        items: orderItems.map((i) => ({
          name: i.name,
          qty: i.quantity,
          price: i.priceAtSale,
        })),
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("POST /api/orders error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
