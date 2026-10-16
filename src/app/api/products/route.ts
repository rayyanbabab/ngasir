import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { product } from "@/lib/db/schema";
import { eq, like, and, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { generateProductBarcode } from "@/lib/barcode";

// Helper: validate session
async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

// GET /api/products — list all products (with optional filters)
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const category = searchParams.get("category");

  const conditions = [];
  if (search) {
    const q = search.trim();
    conditions.push(or(like(product.name, `%${q}%`), eq(product.barcode, q)));
  }
  if (category && category !== "Semua") {
    conditions.push(eq(product.category, category));
  }

  const products =
    conditions.length > 0
      ? await db.select().from(product).where(and(...conditions))
      : await db.select().from(product);

  return NextResponse.json(products);
}

// POST /api/products — create a new product
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, price, stock, category, image, barcode } = body;

    if (!name || price == null || stock == null) {
      return NextResponse.json(
        { error: "name, price, dan stock wajib diisi" },
        { status: 400 }
      );
    }

    let finalBarcode = barcode ? String(barcode).trim() : "";
    if (!finalBarcode) {
      finalBarcode = generateProductBarcode();
    }

    const [newProduct] = await db
      .insert(product)
      .values({
        name: name.trim(),
        price: Number(price),
        stock: Number(stock),
        category: category || "Lainnya",
        image: image || null,
        barcode: finalBarcode,
      })
      .returning();

    return NextResponse.json(newProduct, { status: 201 });
  } catch (err) {
    console.error("POST /api/products error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
