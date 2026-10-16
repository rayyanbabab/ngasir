"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Printer,
  X,
  CheckCircle2,
  Search,
  Receipt,
  QrCode,
  Banknote,
  Loader2,
  ScanBarcode,
  AlertTriangle,
  Package,
  Coffee,
  UtensilsCrossed,
  Tag,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatRupiah, type Product } from "@/lib/mock-data";
import { authClient } from "@/lib/auth-client";
import { printReceipt } from "@/lib/print-receipt";
import { BarcodeScannerDialog } from "@/components/barcode-scanner-dialog";

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

function CategoryIcon({ category, className = "h-4 w-4" }: { category: string; className?: string }) {
  switch (category) {
    case "Makanan":
      return <UtensilsCrossed className={className} />;
    case "Minuman":
      return <Coffee className={className} />;
    case "Kebutuhan":
      return <ShoppingCart className={className} />;
    case "Perlengkapan":
      return <Tag className={className} />;
    default:
      return <Package className={className} />;
  }
}

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
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [scanToast, setScanToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      if (res.status === 401) {
        await authClient.signOut().catch(() => {});
        window.location.href = "/login";
        return;
      }
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
    let active = true;
    fetch("/api/products")
      .then(async (res) => {
        if (res.status === 401) {
          await authClient.signOut().catch(() => {});
          window.location.href = "/login";
          return;
        }
        if (res.ok && active) {
          const data = await res.json();
          setProducts(data);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch products:", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q));
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

  const addToCart = useCallback((product: Product) => {
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
  }, []);

  const handleBarcodeScanned = useCallback((code: string) => {
    const trimmed = code.trim().toLowerCase();
    const found = products.find(
      (p) => (p.barcode && p.barcode.toLowerCase() === trimmed) || p.id.toLowerCase() === trimmed
    );
    if (found) {
      if (found.stock <= 0) {
        setScanToast({ message: `Stok ${found.name} habis!`, type: "error" });
        return;
      }
      addToCart(found);
      setScanToast({ message: `${found.name} dimasukkan ke keranjang`, type: "success" });
    } else {
      setScanToast({ message: `Barcode "${code}" tidak ditemukan!`, type: "error" });
    }
  }, [products, addToCart]);

  // Auto-hide scan feedback toast
  useEffect(() => {
    if (scanToast) {
      const timer = setTimeout(() => setScanToast(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [scanToast]);

  // USB Barcode Scanner hardware listener (keyboard emulation)
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = 0;

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 60 && buffer.length > 0) {
        buffer = "";
      }
      lastKeyTime = currentTime;

      if (e.key === "Enter") {
        if (buffer.length >= 3) {
          e.preventDefault();
          handleBarcodeScanned(buffer);
          buffer = "";
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleBarcodeScanned]);

  function updateQty(id: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) =>
          i.id === id
            ? {
                ...i,
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
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full flex-col lg:flex-row gap-0 overflow-hidden bg-zinc-50/50" id="pos-main">
        {/* ──────────────── Left Column: Product Selection ──────────────── */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 border-r border-zinc-200">
          {/* Top Search & Filter Bar */}
          <div className="flex-none border-b border-zinc-200 bg-white px-4 py-3 space-y-2.5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  id="pos-search"
                  placeholder="Ketik nama produk, kode barcode, atau scan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs bg-zinc-50 border-zinc-200 focus-visible:bg-white"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 gap-1.5 px-3 flex-none h-9 text-xs font-medium shadow-sm"
                onClick={() => setShowBarcodeScanner(true)}
                title="Scan Barcode via Kamera"
              >
                <ScanBarcode className="h-3.5 w-3.5 text-zinc-600" />
                <span className="hidden sm:inline">Scan Kamera</span>
              </Button>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`flex-none inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      isActive
                        ? "bg-zinc-900 text-white shadow-sm"
                        : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100"
                    }`}
                  >
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Grid Area */}
          <div className="flex-1 overflow-y-auto min-h-0 p-4 pb-24 lg:pb-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((product) => {
                const inCart = cart.find((i) => i.id === product.id);
                const isOutOfStock = product.stock === 0;

                return (
                  <div
                    key={product.id}
                    onClick={() => !isOutOfStock && addToCart(product)}
                    className={`group relative flex flex-col justify-between rounded-xl border bg-white p-3 transition-all select-none ${
                      isOutOfStock
                        ? "border-zinc-200/60 opacity-50 cursor-not-allowed"
                        : "border-zinc-200/90 hover:border-zinc-400 hover:shadow-sm cursor-pointer active:scale-[0.99]"
                    } ${inCart ? "ring-2 ring-zinc-900 border-transparent" : ""}`}
                  >
                    {inCart && (
                      <div className="absolute top-2 right-2 z-10 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white shadow-sm">
                        {inCart.quantity}
                      </div>
                    )}

                    <div>
                      {/* Product Thumbnail Frame */}
                      <div className="mb-2.5 h-28 w-full overflow-hidden rounded-lg bg-zinc-100 border border-zinc-200/60 flex items-center justify-center">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-zinc-400">
                            <CategoryIcon category={product.category} className="h-6 w-6 stroke-[1.5]" />
                            <span className="text-[10px] mt-1 font-medium text-zinc-400">
                              {product.category}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Product Meta */}
                      <p className="text-xs font-semibold text-zinc-900 line-clamp-2 leading-snug">
                        {product.name}
                      </p>

                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] text-zinc-500 font-medium">
                          {product.category}
                        </span>
                        {product.barcode && (
                          <span className="text-[9px] font-mono text-zinc-400 bg-zinc-100 px-1 py-0.5 rounded truncate max-w-[80px]">
                            {product.barcode}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price and Stock Footer */}
                    <div className="mt-3 pt-2 border-t border-zinc-100 flex items-end justify-between">
                      <div>
                        <p className="text-xs font-bold text-zinc-900 tabular-nums font-mono">
                          {formatRupiah(product.price)}
                        </p>
                      </div>

                      <div>
                        {product.stock <= 0 ? (
                          <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                            Habis
                          </span>
                        ) : product.stock <= 3 ? (
                          <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                            Sisa {product.stock}
                          </span>
                        ) : product.stock <= 5 ? (
                          <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                            Stok {product.stock}
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-500">
                            Stok: {product.stock}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredProducts.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-16 text-center text-zinc-400">
                  <Package className="h-10 w-10 mb-2 opacity-30" />
                  <p className="text-xs font-medium text-zinc-600">
                    Tidak ada produk yang cocok
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Coba ganti filter kategori atau kata kunci pencarian
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ──────────────── Right Column: Digital POS Ticket / Cart (Desktop) ──────────────── */}
        <div className="hidden lg:flex flex-col w-[340px] xl:w-[380px] flex-none min-h-0 bg-white border-l border-zinc-200">
          {/* Cart Header */}
          <div className="flex-none border-b border-zinc-200 px-4 py-3 flex items-center justify-between bg-zinc-50/50">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-zinc-700" />
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                Struk Transaksi
              </span>
              {cartCount > 0 && (
                <span className="text-[11px] font-semibold bg-zinc-900 text-white px-1.5 py-0.2 rounded">
                  {cartCount}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="h-7 text-[11px] text-zinc-400 hover:text-rose-600 px-2"
                title="Hapus semua item"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Reset
              </Button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-zinc-100 p-3">
            {cart.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-zinc-900 truncate">{item.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-zinc-500 font-mono tabular-nums">
                      {formatRupiah(item.price)}
                    </span>
                    <span className="text-[10px] text-zinc-400">× {item.quantity}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-none">
                  <button
                    onClick={() => updateQty(item.id, -1)}
                    className="flex h-6 w-6 items-center justify-center rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 transition-colors"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-bold font-mono tabular-nums text-zinc-900">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQty(item.id, 1)}
                    disabled={item.quantity >= item.stock}
                    className="flex h-6 w-6 items-center justify-center rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:text-rose-600 transition-colors ml-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400 py-16">
                <ShoppingCart className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-xs font-medium text-zinc-600">Keranjang masih kosong</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Klik produk di sebelah kiri untuk menambahkan
                </p>
              </div>
            )}
          </div>

          {/* Cart Footer */}
          <div className="flex-none border-t border-zinc-200 bg-zinc-50/70 p-4 space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-500">
                <span>Total Item</span>
                <span className="font-mono tabular-nums">{cartCount} pcs</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">{formatRupiah(cartTotal)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-dashed border-zinc-200 flex justify-between items-baseline">
              <span className="text-xs font-semibold text-zinc-700">Total Tagihan</span>
              <span className="text-lg font-bold text-zinc-900 font-mono tabular-nums">
                {formatRupiah(cartTotal)}
              </span>
            </div>

            <Button
              className="w-full h-10 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
              disabled={cart.length === 0}
              onClick={() => {
                setCashInput(String(cartTotal));
                setShowCheckout(true);
              }}
            >
              <Banknote className="h-4 w-4" />
              <span>Proses Pembayaran</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* ──────────────── Mobile: Bottom Cart Bar ──────────────── */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200 bg-white/95 backdrop-blur-md px-4 py-2.5 shadow-lg">
          {cart.length > 0 ? (
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setShowMobileCart(true)}
                className="flex items-center gap-2.5 text-left min-w-0"
              >
                <div className="relative">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white">
                    {cartCount}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 leading-none">Total Tagihan</p>
                  <p className="text-xs font-bold text-zinc-900 font-mono tabular-nums mt-0.5">
                    {formatRupiah(cartTotal)}
                  </p>
                </div>
              </button>

              <Button
                className="h-9 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-sm"
                onClick={() => {
                  setCashInput(String(cartTotal));
                  setShowCheckout(true);
                }}
              >
                Bayar
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-1 text-zinc-400 text-xs">
              <ShoppingCart className="h-3.5 w-3.5 opacity-50" />
              <span>Pilih produk untuk mulai transaksi</span>
            </div>
          )}
        </div>

        {/* ──────────────── Mobile: Cart Dialog ──────────────── */}
        <Dialog open={showMobileCart} onOpenChange={setShowMobileCart}>
          <DialogContent className="lg:hidden max-w-sm w-full flex flex-col max-h-[80vh] p-4">
            <DialogHeader className="flex-none pb-2 border-b border-zinc-100">
              <DialogTitle className="flex items-center justify-between text-xs uppercase font-bold text-zinc-800">
                <span>Daftar Keranjang ({cartCount})</span>
                {cart.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { clearCart(); setShowMobileCart(false); }}
                    className="h-6 text-[10px] text-zinc-400 hover:text-rose-600 px-2"
                  >
                    Kosongkan
                  </Button>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto min-h-0 space-y-2 py-2 divide-y divide-zinc-100">
              {cart.map((item) => (
                <div key={item.id} className="pt-2 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-zinc-900 truncate">{item.name}</p>
                    <p className="text-[11px] font-mono text-zinc-500 tabular-nums">
                      {formatRupiah(item.price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-none">
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      className="flex h-6 w-6 items-center justify-center rounded border border-zinc-200 bg-white"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-5 text-center text-xs font-bold font-mono">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      disabled={item.quantity >= item.stock}
                      className="flex h-6 w-6 items-center justify-center rounded border border-zinc-200 bg-white disabled:opacity-30"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex-none pt-3 border-t border-zinc-200 space-y-2.5">
              <div className="flex justify-between items-baseline text-xs">
                <span className="text-zinc-500">Total</span>
                <span className="text-base font-bold font-mono tabular-nums text-zinc-900">
                  {formatRupiah(cartTotal)}
                </span>
              </div>
              <Button
                className="w-full h-9 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg"
                onClick={() => {
                  setShowMobileCart(false);
                  setCashInput(String(cartTotal));
                  setShowCheckout(true);
                }}
              >
                Lanjut ke Pembayaran
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ──────────────── Checkout Modal (Pembayaran Kasir) ──────────────── */}
        <Dialog
          open={showCheckout}
          onOpenChange={(open) => {
            setShowCheckout(open);
            if (!open) {
              setCashInput("");
              setQrisReceived(false);
            }
          }}
        >
          <DialogContent className="max-w-sm flex flex-col max-h-[92vh] p-5">
            <DialogHeader className="flex-none pb-3 border-b border-zinc-100">
              <DialogTitle className="flex items-center gap-2 text-sm font-bold text-zinc-900">
                <Receipt className="h-4 w-4 text-zinc-700" />
                Konfirmasi Pembayaran
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pt-2">
              {/* Order Amount Highlight */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Total Tagihan
                </p>
                <p className="text-2xl font-bold font-mono tracking-tight text-zinc-900 tabular-nums mt-0.5">
                  {formatRupiah(cartTotal)}
                </p>
                <p className="text-[10px] text-zinc-400 mt-1">
                  {cartCount} item barang dalam transaksi ini
                </p>
              </div>

              {/* Payment Method Selector */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod("TUNAI");
                    setQrisReceived(false);
                  }}
                  className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-xs font-semibold transition-all ${
                    paymentMethod === "TUNAI"
                      ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                      : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  <Banknote className="h-3.5 w-3.5" />
                  Tunai (Cash)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod("QRIS");
                    setCashInput("");
                  }}
                  className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-xs font-semibold transition-all ${
                    paymentMethod === "QRIS"
                      ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                      : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  <QrCode className="h-3.5 w-3.5" />
                  QRIS Digital
                </button>
              </div>

              {/* Cash Payment Mode */}
              {paymentMethod === "TUNAI" && (
                <div className="space-y-2.5">
                  <div>
                    <label className="text-xs font-medium text-zinc-700">
                      Uang Tunai Diterima (Rp)
                    </label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                        Rp
                      </span>
                      <Input
                        id="cash-input"
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={cashInput}
                        onChange={(e) => setCashInput(e.target.value.replace(/\D/g, ""))}
                        className="pl-9 h-10 text-base font-bold font-mono tabular-nums border-zinc-300 focus-visible:ring-zinc-900"
                      />
                    </div>
                  </div>

                  {/* Cash Quick Buttons (Indonesian retail denominations) */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase text-zinc-400">
                      Pecahan Cepat
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCashInput(String(cartTotal))}
                        className="rounded-lg border border-emerald-300 bg-emerald-50 py-1.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
                      >
                        Uang Pas
                      </button>
                      {[10000, 20000, 50000, 100000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setCashInput(String(amt))}
                          className="rounded-lg border border-zinc-200 bg-white py-1.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 transition-colors font-mono tabular-nums"
                        >
                          {formatRupiah(amt)}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setCashInput("")}
                        className="rounded-lg border border-zinc-200 bg-white py-1.5 text-[11px] font-medium text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 transition-colors"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* Change / Shortage Indicator */}
                  {cashAmount > 0 && (
                    <div
                      className={`rounded-xl p-3 text-xs flex justify-between items-center ${
                        change >= 0
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border border-rose-200 bg-rose-50 text-rose-800"
                      }`}
                    >
                      <span className="font-semibold">
                        {change >= 0 ? "Kembalian Kasir:" : "Kurang Bayar:"}
                      </span>
                      <span className="font-bold text-sm font-mono tabular-nums">
                        {formatRupiah(Math.abs(change))}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* QRIS Mode */}
              {paymentMethod === "QRIS" && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-zinc-200 bg-white p-4 flex flex-col items-center justify-center text-center">
                    <div className="h-28 w-28 rounded-lg border-2 border-zinc-900 p-2 flex items-center justify-center bg-white">
                      <QrCode className="h-20 w-20 text-zinc-900" />
                    </div>
                    <p className="text-xs font-semibold text-zinc-900 mt-2">
                      Scan QRIS Merchant
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Gunakan GoPay, OVO, Dana, BCA, atau m-Banking
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setQrisReceived((v) => !v)}
                    className={`w-full flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-semibold transition-all ${
                      qrisReceived
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
                    }`}
                  >
                    <CheckCircle2
                      className={`h-4 w-4 ${
                        qrisReceived ? "text-emerald-700" : "text-zinc-400"
                      }`}
                    />
                    <span>
                      {qrisReceived
                        ? "Dana QRIS Terkonfirmasi Masuk ✓"
                        : "Klik setelah pelanggan berhasil transfer"}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex-none flex gap-2 pt-3 border-t border-zinc-100 mt-2">
              <Button
                variant="outline"
                className="flex-1 h-9 text-xs border-zinc-200"
                onClick={() => setShowCheckout(false)}
              >
                Batal
              </Button>
              <Button
                id="confirm-pay-btn"
                className="flex-1 h-9 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg"
                disabled={
                  (paymentMethod === "TUNAI" ? cashAmount < cartTotal : !qrisReceived) ||
                  submitting
                }
                onClick={handlePay}
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                )}
                Selesaikan Transaksi
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ──────────────── Success & Receipt Modal ──────────────── */}
        <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
          <DialogContent className="max-w-sm text-center p-5">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="h-6 w-6" />
              </div>

              <div>
                <h2 className="text-base font-bold text-zinc-900">
                  Transaksi Selesai
                </h2>
                <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                  No. {lastTx?.id} · {lastTx?.time}
                </p>
              </div>

              {/* Thermal Receipt Preview */}
              {lastTx && (
                <div className="w-full rounded-lg border border-zinc-200 bg-zinc-50/70 p-3.5 text-left text-xs font-mono">
                  <div className="divide-y divide-zinc-200/80">
                    <div className="pb-2 space-y-1">
                      {lastTx.items.map((item) => (
                        <div key={item.id} className="flex justify-between">
                          <span className="truncate pr-2">
                            {item.name} ×{item.quantity}
                          </span>
                          <span className="tabular-nums font-bold">
                            {formatRupiah(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 space-y-1 text-zinc-700">
                      <div className="flex justify-between">
                        <span>Total Tagihan:</span>
                        <span className="font-bold text-zinc-900">
                          {formatRupiah(lastTx.total)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bayar ({lastTx.paymentMethod}):</span>
                        <span>{formatRupiah(lastTx.cash)}</span>
                      </div>
                      {lastTx.paymentMethod === "TUNAI" && (
                        <div className="flex justify-between text-emerald-800 font-bold">
                          <span>Kembalian:</span>
                          <span>{formatRupiah(lastTx.change)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Print and New Order */}
              <div className="flex gap-2 w-full mt-1">
                <Button
                  variant="outline"
                  className="flex-1 h-9 text-xs border-zinc-200"
                  onClick={handlePrint}
                >
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  Cetak Struk
                </Button>
                <Button
                  id="new-transaction-btn"
                  className="flex-1 h-9 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg"
                  onClick={() => setShowSuccess(false)}
                >
                  Transaksi Baru
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Scan feedback toast */}
        {scanToast && (
          <div
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-3.5 py-2 rounded-lg text-xs font-semibold shadow-md border flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150 ${
              scanToast.type === "success"
                ? "bg-zinc-900 text-white border-zinc-800"
                : "bg-rose-700 text-white border-rose-600"
            }`}
          >
            {scanToast.type === "success" ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
            )}
            <span>{scanToast.message}</span>
          </div>
        )}

        {/* Barcode Scanner Modal */}
        <BarcodeScannerDialog
          open={showBarcodeScanner}
          onOpenChange={setShowBarcodeScanner}
          onScan={handleBarcodeScanned}
          title="Scan Barcode Produk"
          description="Arahkan kamera ke barcode produk untuk otomatis menambahkan ke transaksi"
        />
      </div>
    </>
  );
}
