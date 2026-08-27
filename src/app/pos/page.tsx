"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Printer,
  X,
  CheckCircle2,
  Search,
  Receipt,
  QrCode,
  Banknote,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { formatRupiah, type Product } from "@/lib/mock-data";
import { printReceipt } from "@/lib/print-receipt";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
}

interface SavedTransaction {
  id: string;
  items: CartItem[];
  total: number;
  cash: number;
  change: number;
  time: string;
  paymentMethod: "TUNAI" | "QRIS";
}

const CATEGORIES = ["Semua", "Makanan", "Minuman", "Kebutuhan", "Perlengkapan", "Lainnya"];

const CATEGORY_EMOJI: Record<string, string> = {
  Makanan: "🍜",
  Minuman: "🥤",
  Kebutuhan: "🛒",
  Perlengkapan: "🧴",
  Lainnya: "📦",
};

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [showCheckout, setShowCheckout] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [cashInput, setCashInput] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"TUNAI" | "QRIS">("TUNAI");
  const [qrisReceived, setQrisReceived] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastTx, setLastTx] = useState<SavedTransaction | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = activeCategory === "Semua" || p.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [products, search, activeCategory]);

  const cartTotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [cart]
  );

  const cartCount = useMemo(
    () => cart.reduce((acc, item) => acc + item.quantity, 0),
    [cart]
  );

  const cashAmount = parseInt(cashInput.replace(/\D/g, "")) || 0;
  const change = cashAmount - cartTotal;

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          stock: product.stock,
        },
      ];
    });
  }

  function updateQty(id: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) =>
          i.id === id
            ? {
                ...i,
                // Clamp quantity: min 0 triggers removal below, max = stock
                quantity: Math.min(Math.max(i.quantity + delta, 0), i.stock),
              }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  }

  function removeItem(id: string) {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }

  function clearCart() {
    setCart([]);
  }

  async function handlePay() {
    if (paymentMethod === "TUNAI" && cashAmount < cartTotal) return;
    if (paymentMethod === "QRIS" && !qrisReceived) return;

    setSubmitting(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
          paymentMethod: paymentMethod === "TUNAI" ? "CASH" : "QRIS",
          cashAmount: paymentMethod === "TUNAI" ? cashAmount : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Gagal membuat transaksi");
        setSubmitting(false);
        return;
      }

      const orderData = await res.json();

      const snapshot: SavedTransaction = {
        id: orderData.id,
        items: [...cart],
        total: cartTotal,
        cash: paymentMethod === "TUNAI" ? cashAmount : cartTotal,
        change: paymentMethod === "TUNAI" ? cashAmount - cartTotal : 0,
        time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        paymentMethod,
      };

      setLastTx(snapshot);
      setShowCheckout(false);
      setShowSuccess(true);
      setCart([]);
      setCashInput("");
      setQrisReceived(false);
      setPaymentMethod("TUNAI");

      // Refresh products to get updated stock
      fetchProducts();
    } catch (err) {
      console.error("Checkout error:", err);
      alert("Terjadi kesalahan saat checkout");
    } finally {
      setSubmitting(false);
    }
  }

  function handlePrint() {
    if (!lastTx) return;
    printReceipt({
      id: lastTx.id,
      time: lastTx.time,
      items: lastTx.items.map((i) => ({ name: i.name, qty: i.quantity, price: i.price })),
      total: lastTx.total,
      cash: lastTx.paymentMethod === "TUNAI" ? lastTx.cash : undefined,
      change: lastTx.paymentMethod === "TUNAI" ? lastTx.change : undefined,
      paymentMethod: lastTx.paymentMethod === "TUNAI" ? "Tunai" : "QRIS",
    });
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <>
      {/* ══════════════ Main POS UI ══════════════ */}
      <div className="flex h-full flex-col lg:flex-row gap-0 overflow-hidden" id="pos-main">
        {/* ──────────────── Left: Product Grid ──────────────── */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 border-r border-border/50">
          {/* Search + Filter */}
          <div className="flex-none border-b border-border/50 bg-card/50 backdrop-blur-sm px-4 py-3 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="pos-search"
                placeholder="Cari produk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background/60"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex-none rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                    activeCategory === cat
                      ? "bg-emerald-500/15 text-emerald-600 shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {/* pb-28 on mobile to leave room for the sticky cart bar */}
            <div className="p-4 pb-28 lg:pb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((product) => {
                const inCart = cart.find((i) => i.id === product.id);
                const isOutOfStock = product.stock === 0;

                return (
                  <Card
                    key={product.id}
                    onClick={() => !isOutOfStock && addToCart(product)}
                    className={`group relative cursor-pointer border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-200 select-none ${
                      isOutOfStock
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:shadow-md hover:shadow-black/10 hover:border-emerald-500/30 hover:-translate-y-0.5 active:scale-[0.98]"
                    } ${inCart ? "ring-1 ring-emerald-500/40 border-emerald-500/30" : ""}`}
                  >
                    {inCart && (
                      <div className="absolute -top-2 -right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white shadow-md">
                        {inCart.quantity}
                      </div>
                    )}
                    <CardContent className="p-3">
                      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-muted/60 text-2xl">
                        {CATEGORY_EMOJI[product.category] ?? "📦"}
                      </div>
                      <p className="text-sm font-semibold leading-tight line-clamp-2 mb-1">
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground mb-2">{product.category}</p>
                      <p className="text-sm font-bold text-emerald-600">
                        {formatRupiah(product.price)}
                      </p>
                      <p
                        className={`text-xs mt-0.5 ${
                          product.stock <= 3
                            ? "text-rose-500"
                            : product.stock <= 5
                              ? "text-amber-500"
                              : "text-muted-foreground"
                        }`}
                      >
                        Stok: {product.stock}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
              {filteredProducts.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Search className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">Produk tidak ditemukan</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ──────────────── Right: Cart (desktop only) ──────────────── */}
        <div className="hidden lg:flex flex-col w-[340px] xl:w-[380px] flex-none min-h-0 bg-card/50 backdrop-blur-sm">
          {/* Cart Header */}
          <div className="flex-none border-b border-border/50 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-semibold">Keranjang</span>
              {cartCount > 0 && (
                <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-xs px-2 py-0.5">
                  {cartCount} item
                </Badge>
              )}
            </div>
            {cart.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="h-7 text-xs text-muted-foreground hover:text-destructive px-2"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Kosongkan
              </Button>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto min-h-0 px-4 py-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 text-muted-foreground">
                <ShoppingCart className="h-10 w-10 mb-3 opacity-20" />
                <p className="text-sm">Keranjang kosong</p>
                <p className="text-xs mt-1">Klik produk untuk menambahkan</p>
              </div>
            ) : (
              <div className="space-y-2 py-1">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl bg-background/60 border border-border/40 p-3 group"
                  >
                    <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-muted text-lg">
                      {CATEGORY_EMOJI[
                        products.find((p) => p.id === item.id)?.category ?? ""
                      ] ?? "📦"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{item.name}</p>
                      <p className="text-xs text-emerald-600 font-medium">
                        {formatRupiah(item.price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => updateQty(item.id, -1)}
                        className="h-6 w-6 rounded-lg border-border/50"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-bold w-5 text-center tabular-nums">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => updateQty(item.id, 1)}
                        disabled={item.quantity >= item.stock}
                        className="h-6 w-6 rounded-lg border-border/50"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        className="h-6 w-6 rounded-lg text-muted-foreground hover:text-destructive ml-0.5"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Footer */}
          <div className="flex-none border-t border-border/50 px-4 py-4 space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ({cartCount} item)</span>
                <span className="font-medium">{formatRupiah(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pajak (0%)</span>
                <span className="font-medium">—</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between">
                <span className="font-bold">Total</span>
                <span className="text-lg font-bold text-emerald-600">
                  {formatRupiah(cartTotal)}
                </span>
              </div>
            </div>
            <Button
              id="checkout-btn"
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:shadow-emerald-500/40"
              disabled={cart.length === 0}
              onClick={() => setShowCheckout(true)}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Bayar {cart.length > 0 ? formatRupiah(cartTotal) : ""}
            </Button>
          </div>
        </div>

        {/* ──────────────── Mobile: Sticky Cart Bar ──────────────── */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-md border-t border-border/50 safe-area-bottom">
          {cartCount > 0 ? (
            <div className="flex items-center gap-3 px-4 py-3">
              {/* Cart preview — tap to open cart sheet */}
              <button
                onClick={() => setShowMobileCart(true)}
                className="flex-1 flex items-center gap-3 min-w-0 rounded-xl bg-muted/60 px-3 py-2 active:bg-muted transition-colors"
              >
                <div className="relative flex-none">
                  <ShoppingCart className="h-5 w-5 text-emerald-500" />
                  <span className="absolute -top-2.5 -right-2.5 bg-emerald-500 text-white text-[10px] rounded-full h-4.5 w-4.5 min-w-[1.125rem] flex items-center justify-center font-bold px-1">
                    {cartCount}
                  </span>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[11px] text-muted-foreground">{cartCount} item dipilih · ketuk untuk lihat</p>
                  <p className="text-sm font-bold text-emerald-600 truncate">{formatRupiah(cartTotal)}</p>
                </div>
              </button>
              {/* Bayar button */}
              <Button
                className="flex-none bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 h-11 px-5 font-semibold"
                onClick={() => setShowCheckout(true)}
              >
                Bayar
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 px-4 py-3.5 text-muted-foreground">
              <ShoppingCart className="h-4 w-4 opacity-40" />
              <span className="text-sm">Pilih produk untuk mulai transaksi</span>
            </div>
          )}
        </div>

        {/* ──────────────── Mobile: Cart Sheet (Dialog) ──────────────── */}
        <Dialog open={showMobileCart} onOpenChange={setShowMobileCart}>
          <DialogContent className="lg:hidden max-w-sm w-full flex flex-col max-h-[80vh]">
            <DialogHeader className="flex-none">
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-emerald-500" />
                  Keranjang
                </div>
                {cart.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { clearCart(); setShowMobileCart(false); }}
                    className="h-7 text-xs text-muted-foreground hover:text-destructive px-2"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Kosongkan
                  </Button>
                )}
              </DialogTitle>
            </DialogHeader>
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-2 py-2">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl bg-background/60 border border-border/40 p-3"
                >
                  <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-muted text-lg">
                    {CATEGORY_EMOJI[products.find((p) => p.id === item.id)?.category ?? ""] ?? "📦"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{item.name}</p>
                    <p className="text-xs text-emerald-600 font-medium">{formatRupiah(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="icon" onClick={() => updateQty(item.id, -1)} className="h-7 w-7 rounded-lg border-border/50">
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm font-bold w-5 text-center tabular-nums">{item.quantity}</span>
                    <Button variant="outline" size="icon" onClick={() => updateQty(item.id, 1)} disabled={item.quantity >= item.stock} className="h-7 w-7 rounded-lg border-border/50">
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {/* Footer */}
            <div className="flex-none border-t border-border/40 pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ({cartCount} item)</span>
                <span className="font-medium">{formatRupiah(cartTotal)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-emerald-600 text-base">{formatRupiah(cartTotal)}</span>
              </div>
              <Button
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 h-11"
                onClick={() => { setShowMobileCart(false); setShowCheckout(true); }}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Lanjut Bayar · {formatRupiah(cartTotal)}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ──────────────── Checkout Dialog ──────────────── */}
        <Dialog
          open={showCheckout}
          onOpenChange={(open) => {
            setShowCheckout(open);
            if (!open) { setCashInput(""); setQrisReceived(false); }
          }}
        >
          <DialogContent className="max-w-sm flex flex-col max-h-[90vh]">
            <DialogHeader className="flex-none">
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-emerald-500" />
                Konfirmasi Pembayaran
              </DialogTitle>
            </DialogHeader>
            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pt-2 pr-1">
              {/* Order Summary */}
              <div className="rounded-xl border border-border/50 bg-muted/30 divide-y divide-border/30">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-muted-foreground">{item.name} × {item.quantity}</span>
                    <span className="font-medium">{formatRupiah(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-3 font-bold">
                  <span>Total</span>
                  <span className="text-emerald-600 text-base">{formatRupiah(cartTotal)}</span>
                </div>
              </div>

              {/* Payment Method Tabs */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setPaymentMethod("TUNAI"); setQrisReceived(false); }}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-all duration-200 ${
                    paymentMethod === "TUNAI"
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700"
                      : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Banknote className="h-4 w-4" />
                  Tunai
                </button>
                <button
                  onClick={() => { setPaymentMethod("QRIS"); setCashInput(""); }}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-all duration-200 ${
                    paymentMethod === "QRIS"
                      ? "border-violet-500/50 bg-violet-500/10 text-violet-700"
                      : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <QrCode className="h-4 w-4" />
                  QRIS
                </button>
              </div>

              {/* ── Tunai Panel ── */}
              {paymentMethod === "TUNAI" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Uang Diterima</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">Rp</span>
                    <Input
                      id="cash-input"
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={cashInput}
                      onChange={(e) => setCashInput(e.target.value.replace(/\D/g, ""))}
                      className="pl-9 text-lg font-semibold"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[50000, 100000, 150000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setCashInput(String(amt))}
                        className="rounded-lg border border-border/50 bg-muted/50 py-2 text-xs font-medium hover:bg-muted transition-colors"
                      >
                        {formatRupiah(amt)}
                      </button>
                    ))}
                  </div>
                  {cashAmount > 0 && (
                    <div className={`rounded-xl p-3 text-sm flex justify-between ${
                      change >= 0 ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-rose-500/10 border border-rose-500/20"
                    }`}>
                      <span className="font-medium">{change >= 0 ? "Kembalian" : "Kurang"}</span>
                      <span className={`font-bold text-base ${
                        change >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}>{formatRupiah(Math.abs(change))}</span>
                    </div>
                  )}
                </div>
              )}

              {/* ── QRIS Panel ── */}
              {paymentMethod === "QRIS" && (
                <button
                  onClick={() => setQrisReceived((v) => !v)}
                  className={`w-full flex items-center justify-center gap-2.5 rounded-xl border-2 py-4 text-sm font-semibold transition-all duration-200 ${
                    qrisReceived
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700"
                      : "border-dashed border-border text-muted-foreground hover:border-violet-400 hover:bg-violet-50/50 hover:text-violet-700"
                  }`}
                >
                  <CheckCircle2 className={`h-5 w-5 transition-colors ${
                    qrisReceived ? "text-emerald-500" : "text-muted-foreground/50"
                  }`} />
                  {qrisReceived ? "Pembayaran QRIS Sudah Diterima ✓" : "Ketuk jika pembayaran sudah diterima"}
                </button>
              )}
            </div>{/* end scrollable body */}

            {/* Pinned footer — always visible */}
            <div className="flex-none flex gap-2 pt-3 border-t border-border/40">
              <Button variant="outline" className="flex-1" onClick={() => setShowCheckout(false)}>
                Batal
              </Button>
              <Button
                id="confirm-pay-btn"
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                disabled={(paymentMethod === "TUNAI" ? cashAmount < cartTotal : !qrisReceived) || submitting}
                onClick={handlePay}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Konfirmasi
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ──────────────── Success Dialog ──────────────── */}
        <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
          <DialogContent className="max-w-sm text-center">
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Transaksi Berhasil!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {lastTx?.id} · {lastTx?.paymentMethod === "QRIS" ? "QRIS" : "Tunai"} · {lastTx?.time}
                </p>
              </div>

              {/* Items list — uses snapshot, not live cart */}
              {lastTx && (
                <div className="w-full rounded-xl border border-border/40 divide-y divide-border/30 text-left">
                  {lastTx.items.map((item) => (
                    <div key={item.id} className="flex justify-between px-3 py-2 text-sm">
                      <span className="text-muted-foreground">
                        {item.name}{" "}
                        <span className="text-foreground font-medium">×{item.quantity}</span>
                      </span>
                      <span className="font-medium tabular-nums">
                        {formatRupiah(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Totals */}
              <div className="w-full rounded-xl bg-muted/50 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold">{formatRupiah(lastTx?.total ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tunai</span>
                  <span className="font-medium">{formatRupiah(lastTx?.cash ?? 0)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kembalian</span>
                  <span className="font-bold text-emerald-600">
                    {formatRupiah(lastTx?.change ?? 0)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handlePrint}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Cetak Struk
                </Button>
                <Button
                  id="new-transaction-btn"
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
                  onClick={() => setShowSuccess(false)}
                >
                  Transaksi Baru
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
