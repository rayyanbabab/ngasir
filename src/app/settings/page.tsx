"use client";

import { useState } from "react";
import {
  Store,
  Bell,
  Save,
  Printer,
  Shield,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const [storeName, setStoreName] = useState("Toko Pak Ahmad");
  const [ownerName, setOwnerName] = useState("Ahmad Hasanudin");
  const [lowStockThreshold, setLowStockThreshold] = useState("10");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Pengaturan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Konfigurasi toko dan preferensi aplikasi
        </p>
      </div>

      {/* Store Profile */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
              <Store className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-base">Profil Toko</CardTitle>
              <CardDescription className="text-sm">
                Informasi dasar toko Anda
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="store-name">Nama Toko</Label>
            <Input
              id="store-name"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Nama toko Anda"
              className="bg-background/60"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="owner-name">Nama Pemilik</Label>
            <Input
              id="owner-name"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Nama pemilik"
              className="bg-background/60"
            />
          </div>
        </CardContent>
      </Card>

      {/* Inventory Settings */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
              <Bell className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <CardTitle className="text-base">Peringatan Stok</CardTitle>
              <CardDescription className="text-sm">
                Batas minimum stok sebelum peringatan muncul
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5 max-w-xs">
            <Label htmlFor="low-stock">Batas Stok Rendah (pcs)</Label>
            <Input
              id="low-stock"
              type="number"
              min={1}
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              className="bg-background/60"
            />
            <p className="text-xs text-muted-foreground">
              Produk dengan stok di bawah angka ini akan ditandai sebagai peringatan
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Printer Settings */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
              <Printer className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-base">Printer Struk</CardTitle>
              <CardDescription className="text-sm">
                Konfigurasi printer thermal/kasir
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/30 p-4">
            <div>
              <p className="text-sm font-medium">Cetak Otomatis</p>
              <p className="text-xs text-muted-foreground">
                Printer akan terbuka otomatis setelah transaksi
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">Dialog Browser</Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Ngasir menggunakan dialog cetak bawaan browser untuk mendukung printer thermal tanpa instalasi driver tambahan.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="text-xs"
          >
            <Printer className="mr-2 h-3.5 w-3.5" />
            Test Cetak
          </Button>
        </CardContent>
      </Card>

      {/* Account */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10">
              <Shield className="h-4 w-4 text-rose-500" />
            </div>
            <div>
              <CardTitle className="text-base">Akun & Keamanan</CardTitle>
              <CardDescription className="text-sm">
                Kelola akun dan password Anda
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-border/40">
          {[
            { label: "Ganti Password", sub: "Ubah password masuk Anda" },
            { label: "Kelola Pengguna", sub: "Tambah atau hapus akun kasir" },
          ].map((item) => (
            <button
              key={item.label}
              className="flex w-full items-center justify-between py-3.5 text-left hover:text-foreground text-sm transition-colors"
            >
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.sub}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pb-4">
        <Button
          id="save-settings-btn"
          onClick={handleSave}
          className={`transition-all duration-300 ${
            saved
              ? "bg-emerald-600 hover:bg-emerald-600 text-white"
              : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25"
          }`}
        >
          <Save className="mr-2 h-4 w-4" />
          {saved ? "Tersimpan ✓" : "Simpan Pengaturan"}
        </Button>
      </div>
    </div>
  );
}
