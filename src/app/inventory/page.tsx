"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Package,
  Plus,
  Search,
  Pencil,
  Trash2,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { formatRupiah, type Product } from "@/lib/mock-data";

const CATEGORIES = ["Makanan", "Minuman", "Kebutuhan", "Perlengkapan", "Lainnya"];

const CATEGORY_EMOJI: Record<string, string> = {
  Makanan: "🍜",
  Minuman: "🥤",
  Kebutuhan: "🛒",
  Perlengkapan: "🧴",
  Lainnya: "📦",
};

function getLowStockThreshold(): number {
  try {
    const raw = localStorage.getItem("ngasir_settings");
    if (!raw) return 10;
    return parseInt(JSON.parse(raw).lowStockThreshold ?? "10", 10) || 10;
  } catch {
    return 10;
  }
}

type StockStatus = "Aman" | "Rendah" | "Kritis";

function getStockStatus(stock: number, threshold = 10): StockStatus {
  if (stock <= 3) return "Kritis";
  if (stock < threshold) return "Rendah";
  return "Aman";
}

function StockBadge({ stock, threshold = 10 }: { stock: number; threshold?: number }) {
  const status = getStockStatus(stock, threshold);
  if (status === "Kritis") {
    return (
      <Badge variant="destructive" className="text-xs px-2 py-0.5">
        Kritis
      </Badge>
    );
  }
  if (status === "Rendah") {
    return (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border-0 text-xs px-2 py-0.5">
        Rendah
      </Badge>
    );
  }
  return (
    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border-0 text-xs px-2 py-0.5">
      Aman
    </Badge>
  );
}

const EMPTY_FORM = { name: "", price: "", stock: "", category: CATEGORIES[0] };

export default function InventoryPage() {
  const [inventory, setInventory] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"Semua" | StockStatus>("Semua");
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [threshold, setThreshold] = useState(10);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setInventory(data);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setThreshold(getLowStockThreshold());
    fetchProducts();
  }, [fetchProducts]);

  const filtered = useMemo(() => {
    return inventory.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        filterStatus === "Semua" || getStockStatus(p.stock, threshold) === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [inventory, search, filterStatus, threshold]);

  const stats = useMemo(() => {
    const total = inventory.length;
    const kritisCount = inventory.filter((p) => getStockStatus(p.stock, threshold) === "Kritis").length;
    const rendahCount = inventory.filter((p) => getStockStatus(p.stock, threshold) === "Rendah").length;
    const amanCount = inventory.filter((p) => getStockStatus(p.stock, threshold) === "Aman").length;
    const totalValue = inventory.reduce((acc, p) => acc + p.price * p.stock, 0);
    return { total, kritisCount, rendahCount, amanCount, totalValue };
  }, [inventory, threshold]);

  function openAdd() {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setShowDialog(true);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    setForm({
      name: product.name,
      price: String(product.price),
      stock: String(product.stock),
      category: product.category,
    });
    setShowDialog(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.price || !form.stock) return;
    const price = parseInt(form.price.replace(/\D/g, ""));
    const stock = parseInt(form.stock);
    if (isNaN(price) || isNaN(stock)) return;

    setSaving(true);

    try {
      if (editingProduct) {
        const res = await fetch(`/api/products/${editingProduct.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            price,
            stock,
            category: form.category,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Gagal mengupdate produk");
          return;
        }
      } else {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            price,
            stock,
            category: form.category,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Gagal menambah produk");
          return;
        }
      }

      await fetchProducts();
      setShowDialog(false);
    } catch (err) {
      console.error("Save product error:", err);
      alert("Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Gagal menghapus produk");
        return;
      }
      await fetchProducts();
      setDeleteId(null);
    } catch (err) {
      console.error("Delete product error:", err);
      alert("Terjadi kesalahan");
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Inventaris</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola stok dan data produk toko Anda
          </p>
        </div>
        <Button
          id="add-product-btn"
          onClick={openAdd}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:shadow-emerald-500/40 hover:scale-[1.02]"
        >
          <Plus className="mr-2 h-4 w-4" />
          Tambah Produk
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
                <Package className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Produk</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Stok Aman</p>
                <p className="text-xl font-bold">{stats.amanCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rendah</p>
                <p className="text-xl font-bold">{stats.rendahCount + stats.kritisCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10">
                <TrendingUp className="h-4 w-4 text-violet-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Nilai Stok</p>
                <p className="text-sm font-bold">{formatRupiah(stats.totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Daftar Produk</CardTitle>
              <CardDescription className="text-sm">{filtered.length} produk ditemukan</CardDescription>
            </div>
            <div className="flex gap-2 flex-col sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="inventory-search"
                  placeholder="Cari produk..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-8 w-full sm:w-48 text-sm bg-background/60"
                />
              </div>
              <div className="flex gap-1">
                {(["Semua", "Aman", "Rendah", "Kritis"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                      filterStatus === s
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-sm font-medium h-9">Produk</TableHead>
                  <TableHead className="text-sm font-medium h-9">Kategori</TableHead>
                  <TableHead className="text-sm font-medium text-right h-9">Harga</TableHead>
                  <TableHead className="text-sm font-medium text-right h-9">Stok</TableHead>
                  <TableHead className="text-sm font-medium text-right h-9">Status</TableHead>
                  <TableHead className="text-sm font-medium text-right h-9">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((product) => (
                  <TableRow
                    key={product.id}
                    className="border-border/30 hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-muted text-base">
                          {CATEGORY_EMOJI[product.category] ?? "📦"}
                        </div>
                        <span className="text-sm font-medium">{product.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-sm text-muted-foreground">{product.category}</span>
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <span className="text-sm font-semibold tabular-nums">
                        {formatRupiah(product.price)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <span className="text-sm font-bold tabular-nums">{product.stock}</span>
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <StockBadge stock={product.stock} threshold={threshold} />
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(product)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(product.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      Tidak ada produk ditemukan
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Produk" : "Tambah Produk Baru"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="product-name">Nama Produk</Label>
              <Input
                id="product-name"
                placeholder="cth: Indomie Goreng"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="product-price">Harga Jual (Rp)</Label>
                <Input
                  id="product-price"
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={form.price}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    setForm((f) => ({ ...f, price: raw }));
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="product-stock">Stok (pcs)</Label>
                <Input
                  id="product-stock"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form.stock}
                  onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, category: cat }))}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                      form.category === cat
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-border/50 bg-muted/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {CATEGORY_EMOJI[cat]} {cat}
                  </button>
                ))}
              </div>
            </div>
            <Separator />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowDialog(false)}>
                Batal
              </Button>
              <Button
                id="save-product-btn"
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
                onClick={handleSave}
                disabled={!form.name.trim() || !form.price || !form.stock || saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {editingProduct ? "Simpan Perubahan" : "Tambah Produk"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Hapus Produk?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground pt-1">
            Produk{" "}
            <span className="font-semibold text-foreground">
              &ldquo;{inventory.find((p) => p.id === deleteId)?.name}&rdquo;
            </span>{" "}
            akan dihapus secara permanen. Tindakan ini tidak bisa dibatalkan.
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>
              <X className="mr-2 h-4 w-4" />
              Batal
            </Button>
            <Button
              id="confirm-delete-btn"
              variant="destructive"
              className="flex-1"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
