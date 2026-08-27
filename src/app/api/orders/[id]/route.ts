import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { order, orderItem, product } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

// GET /api/orders/[id] — get a single order with its items
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [o] = await db.select().from(order).where(eq(order.id, id));

  if (!o) {
    return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
  }

  const items = await db
    .select({
      id: orderItem.id,
      productId: orderItem.productId,
      quantity: orderItem.quantity,
      priceAtSale: orderItem.priceAtSale,
      name: product.name,
    })
    .from(orderItem)
    .leftJoin(product, eq(orderItem.productId, product.id))
    .where(eq(orderItem.orderId, o.id));

  return NextResponse.json({
    ...o,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    items: items.map((i) => ({
      name: i.name || "Produk dihapus",
      qty: i.quantity,
      price: i.priceAtSale,
    })),
  });
}
