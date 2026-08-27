import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { order, orderItem, product } from "@/lib/db/schema";
import { eq, sql, desc, and, gte, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

// GET /api/dashboard — aggregated stats for the dashboard
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lowStockThreshold = parseInt(searchParams.get("lowStockThreshold") ?? "10", 10);

    // ── Timezone setup ──
    const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
    const now = new Date();

    function toUTCStr(d: Date): string {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
    }

    // Hitung midnight WIB hari ini dalam UTC
    const nowWIB = new Date(now.getTime() + WIB_OFFSET_MS);
    const todayMidnightWIB = new Date(Date.UTC(
      nowWIB.getUTCFullYear(), nowWIB.getUTCMonth(), nowWIB.getUTCDate()
    ));
    const todayStartUTC = new Date(todayMidnightWIB.getTime() - WIB_OFFSET_MS);
    const todayEndUTC   = new Date(todayStartUTC.getTime() + 86400000 - 1);

    const todayStartStr = toUTCStr(todayStartUTC);
    const todayEndStr   = toUTCStr(todayEndUTC);

    // Yesterday boundaries (UTC)
    const yesterdayStartUTC = new Date(todayStartUTC.getTime() - 86400000);
    const yesterdayEndUTC   = new Date(todayStartUTC.getTime() - 1);
    const yesterdayStartStr = toUTCStr(yesterdayStartUTC);
    const yesterdayEndStr   = toUTCStr(yesterdayEndUTC);

    // 30 days ago boundary (UTC)
    const thirtyDaysStartUTC = new Date(todayStartUTC.getTime() - 29 * 86400000);
    const thirtyDaysStartStr = toUTCStr(thirtyDaysStartUTC);

    // ── Single query for last 30 days orders ──
    const allRecentOrders = await db
      .select()
      .from(order)
      .where(
        and(
          gte(order.createdAt, thirtyDaysStartStr),
          eq(order.status, "PAID")
        )
      );

    // Filter today & yesterday in-memory
    const todayOrders = allRecentOrders.filter(
      (o) => o.createdAt >= todayStartStr && o.createdAt <= todayEndStr
    );
    const yesterdayOrders = allRecentOrders.filter(
      (o) => o.createdAt >= yesterdayStartStr && o.createdAt <= yesterdayEndStr
    );

    const todaySales = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const todayTransactions = todayOrders.length;
    const averageOrderValue =
      todayTransactions > 0 ? Math.round(todaySales / todayTransactions) : 0;

    // Batch query products sold for today & yesterday
    const todayOrderIds = todayOrders.map((o) => o.id);
    const yesterdayOrderIds = yesterdayOrders.map((o) => o.id);
    const orderIdsToFetch = Array.from(new Set([...todayOrderIds, ...yesterdayOrderIds]));

    let productsSold = 0;
    let yesterdayProductsSold = 0;

    if (orderIdsToFetch.length > 0) {
      const items = await db
        .select({ orderId: orderItem.orderId, quantity: orderItem.quantity })
        .from(orderItem)
        .where(inArray(orderItem.orderId, orderIdsToFetch));

      const todayIdSet = new Set(todayOrderIds);
      const yesterdayIdSet = new Set(yesterdayOrderIds);

      for (const item of items) {
        if (todayIdSet.has(item.orderId)) {
          productsSold += item.quantity;
        }
        if (yesterdayIdSet.has(item.orderId)) {
          yesterdayProductsSold += item.quantity;
        }
      }
    }

    const yesterdaySales = yesterdayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const yesterdayTransactions = yesterdayOrders.length;
    const yesterdayAvg =
      yesterdayTransactions > 0
        ? Math.round(yesterdaySales / yesterdayTransactions)
        : 0;

    function pctChange(current: number, previous: number): number {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 1000) / 10;
    }

    // ── Hourly sales (today, per jam WIB) ──
    const hourlySales: Array<{ hour: string; sales: number; transactions: number }> = [];
    const datePrefixYesterdayUTC = toUTCStr(todayStartUTC).slice(0, 10) + " ";
    const datePrefixTodayUTC     = toUTCStr(todayMidnightWIB).slice(0, 10) + " ";

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

    // ── Monthly trend (last 30 days in-memory) ──
    const monthlyTrend: Array<{ date: string; sales: number; transactions: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const dayStartUTC = new Date(todayStartUTC.getTime() - i * 86400000);
      const dayEndUTC   = new Date(dayStartUTC.getTime() + 86400000 - 1);
      const dayStartStr = toUTCStr(dayStartUTC);
      const dayEndStr   = toUTCStr(dayEndUTC);

      const dayOrders = allRecentOrders.filter(
        (o) => o.createdAt >= dayStartStr && o.createdAt <= dayEndStr
      );

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

    // ── Recent transactions with items in 1 batch ──
    const recent = await db
      .select()
      .from(order)
      .orderBy(desc(order.createdAt))
      .limit(10);

    const recentIds = recent.map((r) => r.id);
    const recentItems =
      recentIds.length > 0
        ? await db
            .select({ orderId: orderItem.orderId, quantity: orderItem.quantity })
            .from(orderItem)
            .where(inArray(orderItem.orderId, recentIds))
        : [];

    const itemsByOrderId = new Map<string, number>();
    for (const item of recentItems) {
      itemsByOrderId.set(
        item.orderId,
        (itemsByOrderId.get(item.orderId) ?? 0) + item.quantity
      );
    }

    const recentWithItems = recent.map((o) => {
      let createdAtWIB = o.createdAt;
      try {
        const utcDate = new Date(o.createdAt.replace(" ", "T") + "Z");
        const wibDate = new Date(utcDate.getTime() + WIB_OFFSET_MS);
        const pad = (n: number) => String(n).padStart(2, "0");
        createdAtWIB = `${pad(wibDate.getUTCHours())}:${pad(wibDate.getUTCMinutes())}`;
      } catch {
        // fallback
      }

      return {
        id: o.id,
        createdAt: createdAtWIB,
        totalAmount: o.totalAmount,
        paymentMethod: o.paymentMethod,
        status: o.status,
        itemCount: itemsByOrderId.get(o.id) ?? 0,
      };
    });

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
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data dashboard" },
      { status: 500 }
    );
  }
}
