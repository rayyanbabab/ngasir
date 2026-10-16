"use client";

import { useState } from "react";
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
  AlertCircle,
  CheckCircle2,
  Loader2,
  LogOut,
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
import { authClient } from "@/lib/auth-client";

const SETTINGS_KEY = "ngasir_settings";

interface AppSettings {
  storeName: string;
  ownerName: string;
  lowStockThreshold: string;
}

const defaultSettings: AppSettings = {
  storeName: "Toko Kasir UMKM",
  ownerName: "Pemilik Toko",
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
  const [storeName, setStoreName] = useState(() => loadSettings().storeName);
  const [ownerName, setOwnerName] = useState(() => loadSettings().ownerName);
  const [lowStockThreshold, setLowStockThreshold] = useState(
    () => loadSettings().lowStockThreshold
  );
  const [saved, setSaved] = useState(false);

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
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-1 border-b border-zinc-200/70">
        <h1 className="text-lg font-bold tracking-tight text-zinc-900 sm:text-xl">
          Pengaturan Toko & Preferensi
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Identitas bisnis, parameter batas stok, dan keamanan akun kasir
        </p>
      </div>

      {/* Store Profile */}
      <Card className="border border-zinc-200/80 bg-white shadow-sm">
        <CardHeader className="pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 text-zinc-700">
              <Store className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-zinc-900">
                Profil Toko
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Informasi yang dicetak pada struk kasir dan judul aplikasi
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-1.5 max-w-md">
            <Label htmlFor="store-name" className="text-xs font-medium text-zinc-700">
              Nama Toko / Usaha
            </Label>
            <Input
              id="store-name"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Contoh: Toko Berkah Jaya"
              className="h-9 text-xs border-zinc-200"
            />
          </div>
          <div className="space-y-1.5 max-w-md">
            <Label htmlFor="owner-name" className="text-xs font-medium text-zinc-700">
              Nama Pemilik / Kasir
            </Label>
            <Input
              id="owner-name"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Nama penanggung jawab kasir"
              className="h-9 text-xs border-zinc-200"
            />
          </div>
        </CardContent>
      </Card>

      {/* Inventory Settings */}
      <Card className="border border-zinc-200/80 bg-white shadow-sm">
        <CardHeader className="pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 text-zinc-700">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-zinc-900">
                Peringatan Stok Rendah
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Tentukan batas ambang stok produk sebelum status berubah menjadi peringatan
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-1.5 max-w-xs">
            <Label htmlFor="low-stock" className="text-xs font-medium text-zinc-700">
              Ambang Batas Peringatan (pcs)
            </Label>
            <Input
              id="low-stock"
              type="number"
              min={1}
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              className="h-9 text-xs font-mono border-zinc-200"
            />
            <p className="text-[11px] text-zinc-400">
              Produk dengan sisa stok di bawah angka ini akan otomatis ditandai di dashboard
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Printer Settings */}
      <Card className="border border-zinc-200/80 bg-white shadow-sm">
        <CardHeader className="pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 text-zinc-700">
              <Printer className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-zinc-900">
                Konfigurasi Cetak Struk
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Integrasi printer kasir termal 58mm / 80mm
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50/60 p-3">
            <div>
              <p className="text-xs font-semibold text-zinc-800">Mode Cetak Langsung</p>
              <p className="text-[11px] text-zinc-500">
                Menggunakan standar Web Print API bawaan browser untuk semua jenis printer
              </p>
            </div>
            <span className="text-[10px] font-semibold bg-white border border-zinc-200 text-zinc-700 px-2 py-0.5 rounded">
              Universal
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="h-8 text-xs border-zinc-200"
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Uji Sambungan Printer
          </Button>
        </CardContent>
      </Card>

      {/* Account & Security */}
      <Card className="border border-zinc-200/80 bg-white shadow-sm">
        <CardHeader className="pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 text-zinc-700">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-zinc-900">
                Keamanan Akun
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Kredensial akses terminal kasir
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-zinc-100 p-0">
          <button
            onClick={openChangePassword}
            className="flex w-full items-center justify-between px-5 py-3.5 text-left hover:bg-zinc-50 transition-colors"
          >
            <div>
              <p className="text-xs font-semibold text-zinc-800">Ubah Kata Sandi</p>
              <p className="text-[11px] text-zinc-500">Ganti password akses untuk akun ini</p>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-400" />
          </button>

          <button
            onClick={() => setShowComingSoon(true)}
            className="flex w-full items-center justify-between px-5 py-3.5 text-left hover:bg-zinc-50 transition-colors"
          >
            <div>
              <p className="text-xs font-semibold text-zinc-800">Hak Akses Kasir</p>
              <p className="text-[11px] text-zinc-500">Pengaturan multi-karyawan & kasir bergilir</p>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-400" />
          </button>

          <button
            onClick={async () => {
              try {
                await authClient.signOut();
              } finally {
                window.location.href = "/login";
              }
            }}
            className="flex w-full items-center justify-between px-5 py-3.5 text-left text-rose-700 hover:bg-rose-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <LogOut className="h-3.5 w-3.5" />
              <p className="text-xs font-semibold">Keluar dari Terminal (Sign Out)</p>
            </div>
            <ChevronRight className="h-4 w-4 opacity-50" />
          </button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pb-6">
        <Button
          id="save-settings-btn"
          onClick={handleSave}
          className={`h-9 px-4 text-xs font-semibold rounded-lg shadow-sm transition-colors ${
            saved
              ? "bg-emerald-700 hover:bg-emerald-800 text-white"
              : "bg-zinc-900 hover:bg-zinc-800 text-white"
          }`}
        >
          <Save className="mr-1.5 h-3.5 w-3.5" />
          {saved ? "Pengaturan Berhasil Disimpan ✓" : "Simpan Perubahan"}
        </Button>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent className="max-w-sm p-5">
          <DialogHeader className="pb-2 border-b border-zinc-100">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 text-zinc-700">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-zinc-900">
                  Ubah Kata Sandi
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-500">
                  Masukkan kata sandi baru untuk login terminal
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {passwordSuccess ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-xs font-semibold text-emerald-800">
                Kata sandi berhasil diperbarui!
              </p>
            </div>
          ) : (
            <div className="space-y-3.5 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="cp-new" className="text-xs font-medium text-zinc-700">
                  Kata Sandi Baru
                </Label>
                <div className="relative">
                  <Input
                    id="cp-new"
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    className="h-9 text-xs pr-9 border-zinc-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                  >
                    {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cp-confirm" className="text-xs font-medium text-zinc-700">
                  Ulangi Kata Sandi Baru
                </Label>
                <div className="relative">
                  <Input
                    id="cp-confirm"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi"
                    className="h-9 text-xs pr-9 border-zinc-200"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleChangePassword();
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                  >
                    {showConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {passwordError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 text-xs text-rose-700 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 flex-none" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-zinc-100">
                <Button
                  variant="outline"
                  className="flex-1 h-9 text-xs border-zinc-200"
                  onClick={() => setShowChangePassword(false)}
                  disabled={passwordLoading}
                >
                  Batal
                </Button>
                <Button
                  id="confirm-change-password-btn"
                  className="flex-1 h-9 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg"
                  onClick={handleChangePassword}
                  disabled={passwordLoading}
                >
                  {passwordLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : null}
                  Simpan Kata Sandi
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Coming Soon Dialog */}
      <Dialog open={showComingSoon} onOpenChange={setShowComingSoon}>
        <DialogContent className="max-w-xs text-center p-5">
          <div className="flex flex-col items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-zinc-900">
                Manajemen Staf Kasir
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 mt-1">
                Fitur multi-kasir dengan pembagian hak akses sedang dalam tahap pembaruan.
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              className="w-full h-8 text-xs border-zinc-200 mt-2"
              onClick={() => setShowComingSoon(false)}
            >
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
