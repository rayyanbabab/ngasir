"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Package,
  Plus,
  Search,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ScanBarcode,
  Image as ImageIcon,
  Boxes,
  Coffee,
  UtensilsCrossed,
  Tag,
  Coins,
  RotateCcw,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { authClient } from "@/lib/auth-client";
import { formatRupiah, type Product } from "@/lib/mock-data";
import { compressImage } from "@/lib/image-compressor";
import { BarcodeScannerDialog } from "@/components/barcode-scanner-dialog";
import { generateProductBarcode } from "@/lib/barcode";
import { BarcodeView } from "@/components/barcode-view";

const CATEGORIES = ["Makanan", "Minuman", "Kebutuhan", "Perlengkapan", "Lainnya"];

function CategoryIcon({ category, className = "h-3.5 w-3.5" }: { category: string; className?: string }) {
  switch (category) {
    case "Makanan":
      return <UtensilsCrossed className={className} />;
    case "Minuman":
      return <Coffee className={className} />;
    case "Kebutuhan":
      return <Boxes className={className} />;
    case "Perlengkapan":
      return <Tag className={className} />;
    default:
      return <Package className={className} />;
  }
}

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
      <span className="inline-block rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
        Kritis
      </span>
    );
  }
  if (status === "Rendah") {
    return (
      <span className="inline-block rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
        Rendah
      </span>
    );
  }
  return (
    <span className="inline-block rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
      Aman
    </span>
  );
}

const EMPTY_FORM = {
  name: "",
  price: "",
  stock: "",
  category: CATEGORIES[0],
  image: "" as string,
  barcode: "",
};

export default function InventoryPage() {
  const [inventory, setInventory] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"Semua" | StockStatus>("Semua");
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedBarcodeProduct, setSelectedBarcodeProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [threshold] = useState<number>(() => getLowStockThreshold());
  const [compressing, setCompressing] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

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
        setInventory(data);
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
          setInventory(data);
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

  const stats = useMemo(() => {
    const total = inventory.length;
    let totalValue = 0;
    let amanCount = 0;
    let rendahCount = 0;
    let kritisCount = 0;

    for (const p of inventory) {
      totalValue += p.price * p.stock;
      const status = getStockStatus(p.stock, threshold);
      if (status === "Aman") amanCount++;
      else if (status === "Rendah") rendahCount++;
      else kritisCount++;
    }

    return { total, totalValue, amanCount, rendahCount, kritisCount };
  }, [inventory, threshold]);

  const filtered = useMemo(() => {
    return inventory.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q));
      const status = getStockStatus(p.stock, threshold);
      const matchStatus = filterStatus === "Semua" || status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [inventory, search, filterStatus, threshold]);

  function openAdd() {
    setEditingProduct(null);
    setForm({
      ...EMPTY_FORM,
      barcode: generateProductBarcode(), // Otomatis generate barcode baru
    });
    setShowDialog(true);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    setForm({
      name: product.name,
      price: product.price.toString(),
      stock: product.stock.toString(),
      category: product.category,
      image: product.image || "",
      barcode: product.barcode || generateProductBarcode(),
    });
    setShowDialog(true);
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressing(true);
    try {
      const compressedBase64 = await compressImage(file, 600, 600, 0.75);
      setForm((prev) => ({ ...prev, image: compressedBase64 }));
    } catch (err) {
      console.error("Compression error:", err);
      alert("Gagal memproses gambar");
    } finally {
      setCompressing(false);
    }
  }

  async function handleSave() {
    if (!form.name.trim() || !form.price || !form.stock) return;
    const price = parseInt(form.price.replace(/\D/g, ""));
    const stock = parseInt(form.stock);
    if (isNaN(price) || isNaN(stock)) return;

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        price,
        stock,
        category: form.category,
        image: form.image || null,
        barcode: form.barcode.trim() || generateProductBarcode(),
      };

      if (editingProduct) {
        const res = await fetch(`/api/products/${editingProduct.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
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
          body: JSON.stringify(payload),
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
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-1 border-b border-zinc-200/70">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-zinc-900 sm:text-xl">
            Inventaris & Stok Produk
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Kelola katalog barang, barcode otomatis EAN-13, harga jual, dan stok
          </p>
        </div>
        <Button
          id="add-product-btn"
          onClick={openAdd}
          className="h-9 px-3.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg shadow-sm"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Tambah Produk
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border border-zinc-200/80 bg-white shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Total Item
              </span>
              <div className="flex h-6 w-6 items-center justify-center rounded bg-zinc-100 text-zinc-700">
                <Package className="h-3 w-3" />
              </div>
            </div>
            <p className="text-xl font-bold font-mono tracking-tight text-zinc-900 tabular-nums mt-1.5">
              {stats.total} <span className="text-xs font-normal text-zinc-500">SKU</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200/80 bg-white shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Stok Aman
              </span>
              <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
              </div>
            </div>
            <p className="text-xl font-bold font-mono tracking-tight text-emerald-800 tabular-nums mt-1.5">
              {stats.amanCount} <span className="text-xs font-normal text-zinc-500">produk</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200/80 bg-white shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Perlu Restock
              </span>
              <div className="flex h-6 w-6 items-center justify-center rounded bg-amber-50 text-amber-700">
                <AlertTriangle className="h-3 w-3" />
              </div>
            </div>
            <p className="text-xl font-bold font-mono tracking-tight text-amber-800 tabular-nums mt-1.5">
              {stats.rendahCount + stats.kritisCount}{" "}
              <span className="text-xs font-normal text-zinc-500">produk</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200/80 bg-white shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Nilai Persediaan
              </span>
              <div className="flex h-6 w-6 items-center justify-center rounded bg-zinc-100 text-zinc-700">
                <Coins className="h-3 w-3" />
              </div>
            </div>
            <p className="text-base font-bold font-mono tracking-tight text-zinc-900 tabular-nums mt-1.5 truncate">
              {formatRupiah(stats.totalValue)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card className="border border-zinc-200/80 bg-white shadow-sm">
        <CardHeader className="pb-3 border-b border-zinc-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-zinc-900">
                Daftar Inventaris
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                {filtered.length} produk ditampilkan
              </CardDescription>
            </div>

            <div className="flex gap-2 flex-col sm:flex-row">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <Input
                  id="inventory-search"
                  placeholder="Cari nama, barcode, atau kategori..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 w-full sm:w-56 text-xs bg-zinc-50 border-zinc-200 focus-visible:bg-white"
                />
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-lg">
                {(["Semua", "Aman", "Rendah", "Kritis"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                      filterStatus === s
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-zinc-100 bg-zinc-50/50">
                  <TableHead className="text-xs font-semibold text-zinc-500 h-8">Produk & Barcode</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 h-8">Kategori</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 text-right h-8">Harga Jual</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 text-right h-8">Stok</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 text-right h-8">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-zinc-500 text-right h-8 pr-4">Aksi</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.map((product) => (
                  <TableRow
                    key={product.id}
                    className="border-b border-zinc-100 hover:bg-zinc-50/60 transition-colors"
                  >
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-2.5">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="h-9 w-9 flex-none rounded-md object-cover border border-zinc-200"
                          />
                        ) : (
                          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-zinc-100 text-zinc-500 border border-zinc-200/50">
                            <CategoryIcon category={product.category} className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-zinc-900 leading-tight truncate">
                            {product.name}
                          </p>
                          {product.barcode ? (
                            <button
                              type="button"
                              onClick={() => setSelectedBarcodeProduct(product)}
                              className="text-[10px] font-mono text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-1.5 py-0.5 rounded flex items-center gap-1 mt-0.5 transition-colors group cursor-pointer"
                              title="Klik untuk melihat dan mencetak label barcode"
                            >
                              <ScanBarcode className="h-2.5 w-2.5 text-zinc-400 group-hover:text-zinc-900" />
                              <span>{product.barcode}</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-zinc-400 italic">Tanpa barcode</span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-2.5">
                      <span className="text-xs text-zinc-600 font-medium">
                        {product.category}
                      </span>
                    </TableCell>

                    <TableCell className="text-right py-2.5">
                      <span className="text-xs font-bold font-mono tabular-nums text-zinc-900">
                        {formatRupiah(product.price)}
                      </span>
                    </TableCell>

                    <TableCell className="text-right py-2.5">
                      <span className="text-xs font-bold font-mono tabular-nums text-zinc-900">
                        {product.stock}
                      </span>
                    </TableCell>

                    <TableCell className="text-right py-2.5">
                      <StockBadge stock={product.stock} threshold={threshold} />
                    </TableCell>

                    <TableCell className="text-right py-2.5 pr-4">
                      <div className="flex items-center justify-end gap-1">
                        {product.barcode && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedBarcodeProduct(product)}
                            className="h-7 w-7 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
                            title="Cetak Label Barcode"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(product)}
                          className="h-7 w-7 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                          title="Edit Produk"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(product.id)}
                          className="h-7 w-7 text-zinc-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Hapus Produk"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-zinc-400 text-xs">
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

      {/* Add / Edit Product Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto p-5">
          <DialogHeader className="pb-3 border-b border-zinc-100">
            <DialogTitle className="text-sm font-bold text-zinc-900">
              {editingProduct ? "Edit Informasi Produk" : "Tambah Produk Baru"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Foto Produk */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-zinc-700">Foto Produk</Label>
              <div className="flex items-center gap-3">
                {form.image ? (
                  <div className="relative group w-20 h-20 rounded-lg overflow-hidden border border-zinc-200 flex-none">
                    <img
                      src={form.image}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, image: "" }))}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                      title="Hapus Foto"
                    >
                      <Trash2 className="h-4 w-4 text-rose-300" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-20 h-20 rounded-lg border-2 border-dashed border-zinc-300 hover:border-zinc-500 bg-zinc-50/60 hover:bg-zinc-100/60 cursor-pointer transition-colors flex-none">
                    {compressing ? (
                      <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
                    ) : (
                      <>
                        <ImageIcon className="h-5 w-5 text-zinc-400 mb-1" />
                        <span className="text-[10px] text-zinc-500 font-medium">Pilih Foto</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                      disabled={compressing}
                    />
                  </label>
                )}

                <div className="text-xs text-zinc-500 flex-1">
                  <p className="font-medium text-zinc-900 text-xs">Upload Gambar Barang</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Mendukung kamera HP, JPG, atau PNG. Otomatis dikompresi untuk performa kasir.
                  </p>
                  {form.image && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setForm((f) => ({ ...f, image: "" }))}
                      className="h-6 px-2 text-[11px] text-rose-600 hover:text-rose-700 mt-1"
                    >
                      Hapus Foto
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="product-name" className="text-xs font-medium text-zinc-700">
                Nama Produk
              </Label>
              <Input
                id="product-name"
                placeholder="cth: Minyak Goreng 1L"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="h-9 text-xs border-zinc-200"
              />
            </div>

            {/* Barcode & Auto-Generator */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="product-barcode" className="text-xs font-medium text-zinc-700">
                  Barcode / Kode Produk
                </Label>
                <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                  Otomatis EAN-13
                </span>
              </div>
              <div className="flex gap-1.5">
                <Input
                  id="product-barcode"
                  placeholder="Kode barcode otomatis..."
                  value={form.barcode}
                  onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                  className="font-mono text-xs h-9 border-zinc-200 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 flex-none border-zinc-200 hover:bg-zinc-100"
                  onClick={() => setForm((f) => ({ ...f, barcode: generateProductBarcode() }))}
                  title="Generate Ulang Barcode Baru"
                >
                  <RotateCcw className="h-4 w-4 text-zinc-700" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 flex-none border-zinc-200 hover:bg-zinc-100"
                  onClick={() => setShowBarcodeScanner(true)}
                  title="Scan Barcode Kemasan via Kamera"
                >
                  <ScanBarcode className="h-4 w-4 text-zinc-700" />
                </Button>
              </div>

              {/* Barcode SVG Visual Live Preview */}
              {form.barcode && (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-2.5 flex flex-col items-center justify-center">
                  <BarcodeView value={form.barcode} height={40} />
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Pratinjau fisik barcode produk · Siap dibaca scanner kasir
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="product-price" className="text-xs font-medium text-zinc-700">
                  Harga Jual (Rp)
                </Label>
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
                  className="h-9 text-xs font-mono font-medium border-zinc-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="product-stock" className="text-xs font-medium text-zinc-700">
                  Jumlah Stok (pcs)
                </Label>
                <Input
                  id="product-stock"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form.stock}
                  onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                  className="h-9 text-xs font-mono font-medium border-zinc-200"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-zinc-700">Kategori</Label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, category: cat }))}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                      form.category === cat
                        ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    <CategoryIcon category={cat} className="h-3 w-3" />
                    <span>{cat}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-zinc-100">
              <Button
                variant="outline"
                className="flex-1 h-9 text-xs border-zinc-200"
                onClick={() => setShowDialog(false)}
              >
                Batal
              </Button>
              <Button
                id="save-product-btn"
                className="flex-1 h-9 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg"
                onClick={handleSave}
                disabled={!form.name.trim() || !form.price || !form.stock || saving}
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : null}
                {editingProduct ? "Simpan Perubahan" : "Tambah ke Katalog"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerDialog
        open={showBarcodeScanner}
        onOpenChange={setShowBarcodeScanner}
        onScan={(scannedCode) => {
          setForm((f) => ({ ...f, barcode: scannedCode }));
        }}
        title="Scan Barcode Produk"
        description="Arahkan kamera ke barcode produk untuk otomatis membaca kode kemasan"
      />

      {/* Barcode Sticker / Label Modal */}
      <Dialog
        open={!!selectedBarcodeProduct}
        onOpenChange={() => setSelectedBarcodeProduct(null)}
      >
        <DialogContent className="max-w-xs p-5 text-center">
          <DialogHeader className="pb-2 border-b border-zinc-100">
            <DialogTitle className="text-sm font-bold text-zinc-900 flex items-center justify-center gap-1.5">
              <ScanBarcode className="h-4 w-4" />
              Label Barcode Produk
            </DialogTitle>
          </DialogHeader>

          {selectedBarcodeProduct && (
            <div className="space-y-4 pt-2">
              <div
                id="barcode-sticker-print"
                className="rounded-lg border border-dashed border-zinc-300 bg-white p-4 flex flex-col items-center justify-center shadow-sm"
              >
                <p className="text-xs font-bold text-zinc-900 line-clamp-1">
                  {selectedBarcodeProduct.name}
                </p>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  {selectedBarcodeProduct.category}
                </p>

                <div className="my-2">
                  <BarcodeView
                    value={selectedBarcodeProduct.barcode || ""}
                    height={50}
                  />
                </div>

                <p className="text-sm font-bold font-mono tabular-nums text-zinc-900">
                  {formatRupiah(selectedBarcodeProduct.price)}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-9 text-xs border-zinc-200"
                  onClick={() => setSelectedBarcodeProduct(null)}
                >
                  Tutup
                </Button>
                <Button
                  className="flex-1 h-9 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg"
                  onClick={() => {
                    const printWindow = window.open("", "_blank", "width=380,height=380");
                    if (!printWindow) return;
                    const stickerEl = document.getElementById("barcode-sticker-print");
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Barcode - ${selectedBarcodeProduct.name}</title>
                          <style>
                            @page { size: auto; margin: 4mm; }
                            body { font-family: system-ui, sans-serif; text-align: center; margin: 0; padding: 12px; }
                            .print-box { border: 1px dashed #ccc; padding: 14px; border-radius: 6px; display: inline-block; }
                          </style>
                        </head>
                        <body>
                          <div class="print-box">
                            ${stickerEl?.innerHTML || ""}
                          </div>
                          <script>
                            window.onload = function() { window.print(); window.close(); }
                          </script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }}
                >
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  Cetak Label
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700 text-sm">
              <Trash2 className="h-4 w-4" />
              Hapus Produk dari Katalog?
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-zinc-500 pt-1">
            Produk{" "}
            <span className="font-semibold text-zinc-900">
              &ldquo;{inventory.find((p) => p.id === deleteId)?.name}&rdquo;
            </span>{" "}
            akan dihapus secara permanen dari sistem inventaris.
          </p>
          <div className="flex gap-2 pt-3">
            <Button
              variant="outline"
              className="flex-1 h-9 text-xs border-zinc-200"
              onClick={() => setDeleteId(null)}
            >
              Batal
            </Button>
            <Button
              id="confirm-delete-btn"
              variant="destructive"
              className="flex-1 h-9 text-xs font-semibold rounded-lg"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Ya, Hapus
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
