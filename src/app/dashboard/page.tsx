"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  BarChart3,
  Package,
  ArrowRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Banknote,
  QrCode,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  formatRupiah,
  formatCompact,
  type DashboardStats,
  type HourlySales,
  type DailyTrend,
  type Product,
  type Transaction,
} from "@/lib/mock-data";
import Link from "next/link";

// Custom tooltip for charts
function CustomBarTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-xl">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{formatRupiah(payload[0].value)}</p>
      </div>
    );
  }
  return null;
}

function CustomAreaTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-xl">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{formatRupiah(payload[0].value)}</p>
      </div>
    );
  }
  return null;
}

// Payment Method Badge
function PaymentBadge({ method }: { method: "CASH" | "QRIS" }) {
  if (method === "QRIS") {
    return (
      <Badge className="bg-violet-500/15 text-violet-700 dark:text-violet-400 hover:bg-violet-500/20 border-0 text-xs px-2 py-0.5 gap-1">
        <QrCode className="h-3 w-3" />
        QRIS
      </Badge>
    );
  }
  return (
    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border-0 text-xs px-2 py-0.5 gap-1">
      <Banknote className="h-3 w-3" />
      Tunai
    </Badge>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor,
  iconBg,
}: {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
  prefix?: string;
  iconColor: string;
  iconBg: string;
}) {
  const isPositive = change >= 0;
  return (
    <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-black/5 hover:border-border">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-transparent group-hover:from-emerald-500/[0.02] group-hover:to-teal-500/[0.02] transition-all duration-500" />
      <CardContent className="p-5 relative">
        {/* Top row: title + icon */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider leading-tight">
            {title}
          </p>
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg} transition-transform duration-300 group-hover:scale-110`}
          >
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
        </div>
        {/* Value */}
        <p className="text-2xl font-bold tracking-tight mb-3">{value}</p>
        {/* Change badge */}
        <div className="flex items-center gap-1.5">
          {isPositive ? (
            <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5">
              <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                +{change}%
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5">
              <TrendingDown className="h-3 w-3 text-rose-600 dark:text-rose-400" />
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                {change}%
              </span>
            </div>
          )}
          <span className="text-xs text-muted-foreground">vs kemarin</span>
        </div>
      </CardContent>
    </Card>
  );
}

interface DashboardData {
  stats: DashboardStats;
  hourlySalesData: HourlySales[];
  monthlyTrendData: DailyTrend[];
  lowStockProducts: Product[];
  recentTransactions: Transaction[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchDashboard();
  }, [fetchDashboard]);

  const now = new Date();
  const greeting =
    now.getHours() < 12
      ? "Selamat Pagi"
      : now.getHours() < 17
        ? "Selamat Siang"
        : "Selamat Malam";

  const todayDate = now.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (loading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const { stats, hourlySalesData, monthlyTrendData, lowStockProducts, recentTransactions } = data;

  function formatTime(createdAt: string) {
    if (/^\d{2}:\d{2}$/.test(createdAt)) return createdAt;
    try {
      const d = new Date(createdAt.replace(" ", "T") + "Z");
      return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return createdAt;
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {greeting} 👋
          </h1>
          <p className="mt-1 text-base text-muted-foreground">{todayDate}</p>
        </div>
        <Link href="/pos">
          <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:shadow-emerald-500/40 hover:scale-[1.02]">
            <ShoppingBag className="mr-2 h-4 w-4" />
            Mulai Transaksi
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Penjualan Hari Ini"
          value={formatRupiah(stats.todaySales)}
          change={stats.todaySalesChange}
          icon={DollarSign}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-500/10"
        />
        <StatCard
          title="Total Transaksi"
          value={stats.todayTransactions.toString()}
          change={stats.todayTransactionsChange}
          icon={ShoppingBag}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-500/10"
        />
        <StatCard
          title="Rata-rata / Transaksi"
          value={formatRupiah(stats.averageOrderValue)}
          change={stats.averageOrderChange}
          icon={BarChart3}
          iconColor="text-violet-600 dark:text-violet-400"
          iconBg="bg-violet-500/10"
        />
        <StatCard
          title="Produk Terjual"
          value={`${stats.productsSold} item`}
          change={stats.productsSoldChange}
          icon={Package}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-500/10"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Hourly Sales Bar Chart */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Penjualan Hari Ini
                </CardTitle>
                <CardDescription className="text-sm">
                  Pendapatan per jam
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs font-medium">
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[280px] w-full">
              {!mounted ? null : hourlySalesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlySalesData} barCategoryGap="20%">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e5e7eb"
                    />
                    <XAxis
                      dataKey="hour"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      tickFormatter={(v) => formatCompact(v)}
                    />
                    <Tooltip
                      content={<CustomBarTooltip />}
                      cursor={{ fill: "rgba(0,0,0,0.05)", radius: 4 }}
                    />
                    <Bar
                      dataKey="sales"
                      fill="url(#barGradient)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={40}
                    />
                    <defs>
                      <linearGradient
                        id="barGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="rgb(16, 185, 129)"
                          stopOpacity={1}
                        />
                        <stop
                          offset="100%"
                          stopColor="rgb(20, 184, 166)"
                          stopOpacity={0.6}
                        />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                  Belum ada transaksi hari ini
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trend Area Chart */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Tren Penjualan Bulanan
                </CardTitle>
                <CardDescription className="text-sm">
                  30 hari terakhir
                </CardDescription>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1">
                <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  +{stats.todaySalesChange}%
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[280px] w-full">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrendData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e5e7eb"
                    />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      interval={4}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      tickFormatter={(v) => formatCompact(v)}
                    />
                    <Tooltip content={<CustomAreaTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="rgb(16, 185, 129)"
                      strokeWidth={2}
                      fill="url(#areaGradient)"
                    />
                    <defs>
                      <linearGradient
                        id="areaGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="rgb(16, 185, 129)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor="rgb(16, 185, 129)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
        {/* Low Stock Alert */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">
                    Peringatan Stok
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Stok menipis (&lt; 10 item)
                  </CardDescription>
                </div>
              </div>
              <Badge variant="destructive" className="text-xs">
                {lowStockProducts.length} produk
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-sm font-medium h-8">Produk</TableHead>
                  <TableHead className="text-sm font-medium text-right h-8">Sisa Stok</TableHead>
                  <TableHead className="text-sm font-medium text-right h-8">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockProducts.map((product) => (
                  <TableRow
                    key={product.id}
                    className="border-border/30 hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="py-2.5">
                      <div>
                        <p className="text-sm font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.category}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-2.5">
                      <span className="text-sm font-semibold tabular-nums">
                        {product.stock}
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-2.5">
                      {product.stock <= 3 ? (
                        <Badge
                          variant="destructive"
                          className="text-xs px-2 py-0.5"
                        >
                          Kritis
                        </Badge>
                      ) : product.stock <= 5 ? (
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border-0 text-xs px-2 py-0.5">
                          Rendah
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-400 hover:bg-orange-500/20 border-0 text-xs px-2 py-0.5">
                          Perhatian
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {lowStockProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground text-sm">
                      Semua stok aman ✓
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">
                    Transaksi Terakhir
                  </CardTitle>
                  <CardDescription className="text-sm">
                    5 transaksi terbaru
                  </CardDescription>
                </div>
              </div>
              <Link href="/transactions">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                  Lihat Semua
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0 flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-sm font-medium h-8">ID</TableHead>
                  <TableHead className="text-sm font-medium h-8">Waktu</TableHead>
                  <TableHead className="text-sm font-medium text-right h-8">Item</TableHead>
                  <TableHead className="text-sm font-medium text-right h-8">Total</TableHead>
                  <TableHead className="text-sm font-medium text-center h-8">Metode</TableHead>
                  <TableHead className="text-sm font-medium text-right h-8">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map((tx) => (
                  <TableRow
                    key={tx.id}
                    className="border-border/30 hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="py-2.5">
                      <span className="text-sm font-mono font-medium">{tx.id}</span>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <span className="text-sm text-muted-foreground">{formatTime(tx.createdAt)}</span>
                    </TableCell>
                    <TableCell className="text-right py-2.5">
                      <span className="text-sm tabular-nums">{tx.itemCount} item</span>
                    </TableCell>
                    <TableCell className="text-right py-2.5">
                      <span className="text-sm font-semibold tabular-nums">
                        {formatRupiah(tx.totalAmount)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center py-2.5">
                      <PaymentBadge method={tx.paymentMethod} />
                    </TableCell>
                    <TableCell className="text-right py-2.5">
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border-0 text-xs px-2 py-0.5">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        {tx.status === "PAID" ? "Lunas" : "Pending"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {recentTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                      Belum ada transaksi
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
