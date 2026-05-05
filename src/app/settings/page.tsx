"use client";

import { useState, useEffect } from "react";
import {
  Store,
  Bell,
  Save,
  Printer,
  Shield,
  ChevronRight,
  Lock,
  Eye,
  EyeOff,
  Users,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Loader2,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { authClient } from "@/lib/auth-client";

const SETTINGS_KEY = "ngasir_settings";

interface AppSettings {
  storeName: string;
  ownerName: string;
  lowStockThreshold: string;
}

const defaultSettings: AppSettings = {
  storeName: "Toko Pak Ahmad",
  ownerName: "Ahmad Hasanudin",
  lowStockThreshold: "10",
};

function loadSettings(): AppSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

export default function SettingsPage() {
  const [storeName, setStoreName] = useState(defaultSettings.storeName);
  const [ownerName, setOwnerName] = useState(defaultSettings.ownerName);
  const [lowStockThreshold, setLowStockThreshold] = useState(
    defaultSettings.lowStockThreshold
  );
  const [saved, setSaved] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Change password dialog
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Coming soon dialog
  const [showComingSoon, setShowComingSoon] = useState(false);

  useEffect(() => {
    const settings = loadSettings();
    setStoreName(settings.storeName);
    setOwnerName(settings.ownerName);
    setLowStockThreshold(settings.lowStockThreshold);
    setHydrated(true);
  }, []);

  async function handleSave() {
    const settings: AppSettings = { storeName, ownerName, lowStockThreshold };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

    const { error } = await authClient.updateUser({ name: ownerName });
    if (error) console.error("Gagal update nama di database:", error);

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function openChangePassword() {
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setPasswordSuccess(false);
    setShowChangePassword(true);
  }

  async function handleChangePassword() {
    setPasswordError("");

    if (!newPassword || !confirmPassword) {
      setPasswordError("Semua field harus diisi.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Password baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi password tidak cocok.");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch("/api/user/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.error || "Gagal mengganti password.");
      } else {
        setPasswordSuccess(true);
        setTimeout(() => setShowChangePassword(false), 1800);
      }
    } catch {
      setPasswordError("Terjadi kesalahan, coba lagi.");
    } finally {
      setPasswordLoading(false);
    }
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
              disabled={!hydrated}
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
              disabled={!hydrated}
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
              disabled={!hydrated}
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

      {/* Account & Security */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10">
              <Shield className="h-4 w-4 text-rose-500" />
            </div>
            <div>
              <CardTitle className="text-base">Akun &amp; Keamanan</CardTitle>
              <CardDescription className="text-sm">
                Kelola akun dan password Anda
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-border/40">
          <button
            onClick={openChangePassword}
            className="flex w-full items-center justify-between py-3.5 text-left hover:text-foreground text-sm transition-colors"
          >
            <div>
              <p className="font-medium">Ganti Password</p>
              <p className="text-xs text-muted-foreground">Ubah password masuk Anda</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => setShowComingSoon(true)}
            className="flex w-full items-center justify-between py-3.5 text-left hover:text-foreground text-sm transition-colors"
          >
            <div>
              <p className="font-medium">Kelola Pengguna</p>
              <p className="text-xs text-muted-foreground">Tambah atau hapus akun kasir</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pb-4">
        <Button
          id="save-settings-btn"
          onClick={handleSave}
          disabled={!hydrated}
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

      {/* ── Change Password Dialog ── */}
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10">
                <Lock className="h-4 w-4 text-rose-500" />
              </div>
              <div>
                <DialogTitle>Ganti Password</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Masukkan password baru Anda
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {passwordSuccess ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              </div>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                Password berhasil diubah!
              </p>
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              {/* New password */}
              <div className="space-y-1.5">
                <Label htmlFor="cp-new">Password Baru</Label>
                <div className="relative">
                  <Input
                    id="cp-new"
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 karakter"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <Label htmlFor="cp-confirm">Konfirmasi Password Baru</Label>
                <div className="relative">
                  <Input
                    id="cp-confirm"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                    className="pr-10"
                    onKeyDown={(e) => { if (e.key === "Enter") handleChangePassword(); }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {passwordError && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-destructive">
                  <AlertCircle className="h-4 w-4 flex-none" />
                  <p className="text-xs">{passwordError}</p>
                </div>
              )}

              <Separator />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowChangePassword(false)}
                  disabled={passwordLoading}
                >
                  Batal
                </Button>
                <Button
                  id="confirm-change-password-btn"
                  className="flex-1 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white"
                  onClick={handleChangePassword}
                  disabled={passwordLoading}
                >
                  {passwordLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Lock className="h-4 w-4 mr-2" />
                  )}
                  {passwordLoading ? "Menyimpan..." : "Ganti Password"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Coming Soon Dialog ── */}
      <Dialog open={showComingSoon} onOpenChange={setShowComingSoon}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20">
                  <Users className="h-8 w-8 text-violet-500" />
                </div>
                <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
              </div>
              <div>
                <DialogTitle className="text-lg">Kelola Pengguna</DialogTitle>
                <DialogDescription className="mt-1.5 text-sm leading-relaxed">
                  Fitur manajemen akun kasir sedang dalam pengembangan dan akan segera hadir.
                </DialogDescription>
              </div>
              <Badge className="bg-violet-500/15 text-violet-700 dark:text-violet-400 border-0 px-3 py-1 text-xs font-semibold">
                <Sparkles className="h-3 w-3 mr-1.5" />
                Segera Hadir
              </Badge>
            </div>
          </DialogHeader>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowComingSoon(false)}
          >
            Tutup
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
