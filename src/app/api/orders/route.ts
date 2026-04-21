import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { order, orderItem, product } from "@/lib/db/schema";
import { eq, like, and, desc, gte, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Generate a human-readable order ID: TRX-YYYYMMDD-NNNN
 * e.g. TRX-20260421-0001, TRX-20260421-0002, ...
 */
function generateOrderId(): string {
  const now = new Date();
  const dateStr =
    String(now.getFullYear()) +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");

  const prefix = `TRX-${dateStr}-`;

  // Find the highest existing sequence number for today
  const todayOrders = db
    .select({ id: order.id })
    .from(order)
    .where(like(order.id, `${prefix}%`))
    .all();

  let maxNum = 0;
  for (const o of todayOrders) {
    const suffix = o.id.replace(prefix, "");
    const num = parseInt(suffix, 10);
    if (!isNaN(num) && num > maxNum) maxNum = num;
  }

  return `${prefix}${String(maxNum + 1).padStart(4, "0")}`;
}

// GET /api/orders — list all orders with items
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
      ? db
          .select()
          .from(order)
          .where(and(...conditions))
          .orderBy(desc(order.createdAt))
          .all()
      : db.select().from(order).orderBy(desc(order.createdAt)).all();

  // Fetch items for each order
  const ordersWithItems = orders.map((o) => {
    const items = db
      .select({
        id: orderItem.id,
        productId: orderItem.productId,
        quantity: orderItem.quantity,
        priceAtSale: orderItem.priceAtSale,
        name: product.name,
      })
      .from(orderItem)
      .leftJoin(product, eq(orderItem.productId, product.id))
      .where(eq(orderItem.orderId, o.id))
      .all();

    return {
      ...o,
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      items: items.map((i) => ({
        name: i.name || "Produk dihapus",
        qty: i.quantity,
        price: i.priceAtSale,
      })),
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

    // Validate products and calculate total
    let totalAmount = 0;
    const orderItems: Array<{
      productId: string;
      quantity: number;
      priceAtSale: number;
    }> = [];

    for (const item of items) {
      const [p] = db
        .select()
        .from(product)
        .where(eq(product.id, item.productId))
        .all();

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
        quantity: item.quantity,
        priceAtSale: p.price,
      });
    }

    // Create order + items + decrement stock in a transaction
    const result = db.transaction((tx) => {
      // Create order
      const [newOrder] = tx
        .insert(order)
        .values({
          id: generateOrderId(),
          totalAmount,
          paymentMethod,
          cashAmount: paymentMethod === "CASH" ? (cashAmount ?? null) : null,
          status: "PAID",
          userId: session.user.id,
        })
        .returning()
        .all();

      // Create order items
      for (const oi of orderItems) {
        tx.insert(orderItem)
          .values({
            orderId: newOrder.id,
            productId: oi.productId,
            quantity: oi.quantity,
            priceAtSale: oi.priceAtSale,
          })
          .run();

        // Decrement stock
        tx.update(product)
          .set({ stock: sql`${product.stock} - ${oi.quantity}` })
          .where(eq(product.id, oi.productId))
          .run();
      }

      return newOrder;
    });

    // Re-fetch order with items for response
    const createdItems = db
      .select({
        name: product.name,
        qty: orderItem.quantity,
        price: orderItem.priceAtSale,
      })
      .from(orderItem)
      .leftJoin(product, eq(orderItem.productId, product.id))
      .where(eq(orderItem.orderId, result.id))
      .all();

    return NextResponse.json(
      {
        ...result,
        items: createdItems.map((i) => ({
          name: i.name || "Produk dihapus",
          qty: i.qty,
          price: i.price,
        })),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/orders error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
