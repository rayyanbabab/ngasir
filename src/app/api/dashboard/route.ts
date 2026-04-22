import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { order, orderItem, product } from "@/lib/db/schema";
import { eq, sql, desc, and, gte, lte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

// GET /api/dashboard — aggregated stats for the dashboard
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const lowStockThreshold = parseInt(searchParams.get("lowStockThreshold") ?? "10", 10);

  // ── Timezone setup ──
  // SQLite datetime('now') menyimpan waktu dalam UTC.
  // "Hari ini" dalam WIB (UTC+7): midnight WIB = UTC-7h.
  const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
  const now = new Date();

  // Helper: format Date ke "YYYY-MM-DD HH:MM:SS" dalam UTC
  // SQLite/Turso datetime('now') menyimpan dengan SPASI, bukan "T"
  // Contoh: "2026-04-21 07:16:00" — BUKAN "2026-04-21T07:16:00"
  function toUTCStr(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  }

  // Hitung midnight WIB hari ini dalam UTC
  const nowWIB = new Date(now.getTime() + WIB_OFFSET_MS);
  const todayMidnightWIB = new Date(Date.UTC(
    nowWIB.getUTCFullYear(), nowWIB.getUTCMonth(), nowWIB.getUTCDate()
  ));
  // Midnight WIB dalam UTC = midnight WIB - 7 jam
  const todayStartUTC = new Date(todayMidnightWIB.getTime() - WIB_OFFSET_MS);
  const todayEndUTC   = new Date(todayStartUTC.getTime() + 86400000 - 1);

  const todayStartStr = toUTCStr(todayStartUTC);
  const todayEndStr   = toUTCStr(todayEndUTC);

  // Yesterday boundaries (UTC)
  const yesterdayStartUTC = new Date(todayStartUTC.getTime() - 86400000);
  const yesterdayEndUTC   = new Date(todayStartUTC.getTime() - 1);
  const yesterdayStartStr = toUTCStr(yesterdayStartUTC);
  const yesterdayEndStr   = toUTCStr(yesterdayEndUTC);

  // ── Today stats ──
  const todayOrders = await db
    .select()
    .from(order)
    .where(
      and(
        gte(order.createdAt, todayStartStr),
        lte(order.createdAt, todayEndStr),
        eq(order.status, "PAID")
      )
    );

  const todaySales = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const todayTransactions = todayOrders.length;
  const averageOrderValue =
    todayTransactions > 0 ? Math.round(todaySales / todayTransactions) : 0;

  // Products sold today
  const todayOrderIds = todayOrders.map((o) => o.id);
  let productsSold = 0;
  if (todayOrderIds.length > 0) {
    for (const orderId of todayOrderIds) {
      const items = await db
        .select({ quantity: orderItem.quantity })
        .from(orderItem)
        .where(eq(orderItem.orderId, orderId));
      productsSold += items.reduce((sum, i) => sum + i.quantity, 0);
    }
  }

  // ── Yesterday stats (for comparison) ──
  const yesterdayOrders = await db
    .select()
    .from(order)
    .where(
      and(
        gte(order.createdAt, yesterdayStartStr),
        lte(order.createdAt, yesterdayEndStr),
        eq(order.status, "PAID")
      )
    );

  const yesterdaySales = yesterdayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const yesterdayTransactions = yesterdayOrders.length;
  const yesterdayAvg =
    yesterdayTransactions > 0
      ? Math.round(yesterdaySales / yesterdayTransactions)
      : 0;

  let yesterdayProductsSold = 0;
  for (const o of yesterdayOrders) {
    const items = await db
      .select({ quantity: orderItem.quantity })
      .from(orderItem)
      .where(eq(orderItem.orderId, o.id));
    yesterdayProductsSold += items.reduce((sum, i) => sum + i.quantity, 0);
  }

  // Calculate % changes
  function pctChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }

  // ── Hourly sales (today, per jam WIB) ──
  // Konversi WIB → UTC untuk mencari data di DB:
  //   WIB 00:00–06:59 = UTC 17:00–23:59 hari KEMARIN UTC  → datePrefix = tanggal todayStartUTC  (2026-04-20T)
  //   WIB 07:00–23:59 = UTC 00:00–16:59 hari INI UTC      → datePrefix = tanggal todayMidnightWIB (2026-04-21T)
  const hourlySales: Array<{ hour: string; sales: number; transactions: number }> = [];
  // Pre-compute date prefixes (sudah ada "T" di akhir dari toUTCStr().slice(0,11))
  const datePrefixYesterdayUTC = toUTCStr(todayStartUTC).slice(0, 11);   // e.g. "2026-04-20T"
  const datePrefixTodayUTC     = toUTCStr(todayMidnightWIB).slice(0, 11); // e.g. "2026-04-21T"

  for (let h = 0; h < 24; h++) {
    const hUTC    = (h - 7 + 24) % 24;
    const hUTCStr = String(hUTC).padStart(2, "0");
    const datePrefix = h < 7 ? datePrefixYesterdayUTC : datePrefixTodayUTC;
    const hourStart  = `${datePrefix}${hUTCStr}:00:00`;
    const hourEnd    = `${datePrefix}${hUTCStr}:59:59`;

    const hourOrders = todayOrders.filter(
      (o) => o.createdAt >= hourStart && o.createdAt <= hourEnd
    );
    hourlySales.push({
      hour: `${String(h).padStart(2, "0")}:00`,
      sales: hourOrders.reduce((s, o) => s + o.totalAmount, 0),
      transactions: hourOrders.length,
    });
  }


  // ── Monthly trend (last 30 days, per hari WIB) ──
  const monthlyTrend: Array<{ date: string; sales: number; transactions: number }> = [];
  for (let i = 29; i >= 0; i--) {
    // Hari ke-i WIB yang lalu
    const dayStartUTC = new Date(todayStartUTC.getTime() - i * 86400000);
    const dayEndUTC   = new Date(dayStartUTC.getTime() + 86400000 - 1);
    const dayStartStr = toUTCStr(dayStartUTC);
    const dayEndStr   = toUTCStr(dayEndUTC);

    const dayOrders = await db
      .select()
      .from(order)
      .where(
        and(
          gte(order.createdAt, dayStartStr),
          lte(order.createdAt, dayEndStr),
          eq(order.status, "PAID")
        )
      );

    // Label tanggal dalam WIB
    const dayWIB = new Date(dayStartUTC.getTime() + WIB_OFFSET_MS);
    monthlyTrend.push({
      date: dayWIB.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
      sales: dayOrders.reduce((s, o) => s + o.totalAmount, 0),
      transactions: dayOrders.length,
    });
  }

  // ── Low stock products ──
  const lowStock = await db
    .select()
    .from(product)
    .where(sql`${product.stock} < ${lowStockThreshold}`)
    .orderBy(product.stock);

  // ── Recent transactions ──
  const recent = await db
    .select()
    .from(order)
    .orderBy(desc(order.createdAt))
    .limit(10);

  const recentWithItems = await Promise.all(
    recent.map(async (o) => {
      const items = await db
        .select({ quantity: orderItem.quantity })
        .from(orderItem)
        .where(eq(orderItem.orderId, o.id));

      // Convert createdAt UTC → WIB untuk display
      const utcDate = new Date(o.createdAt.replace(" ", "T") + "Z");
      const wibDate = new Date(utcDate.getTime() + WIB_OFFSET_MS);
      const pad = (n: number) => String(n).padStart(2, "0");
      const createdAtWIB = `${pad(wibDate.getUTCHours())}:${pad(wibDate.getUTCMinutes())}`;

      return {
        id: o.id,
        createdAt: createdAtWIB,
        totalAmount: o.totalAmount,
        paymentMethod: o.paymentMethod,
        status: o.status,
        itemCount: items.reduce((s, i) => s + i.quantity, 0),
      };
    })
  );

  return NextResponse.json({
    stats: {
      todaySales,
      todaySalesChange: pctChange(todaySales, yesterdaySales),
      todayTransactions,
      todayTransactionsChange: pctChange(todayTransactions, yesterdayTransactions),
      averageOrderValue,
      averageOrderChange: pctChange(averageOrderValue, yesterdayAvg),
      productsSold,
      productsSoldChange: pctChange(productsSold, yesterdayProductsSold),
    },
    hourlySalesData: hourlySales,
    monthlyTrendData: monthlyTrend,
    lowStockProducts: lowStock,
    recentTransactions: recentWithItems,
  });
}
