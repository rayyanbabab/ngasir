"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Store, Eye, EyeOff, ArrowRight, ShieldCheck, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isPending && session?.user) {
      router.replace("/dashboard");
    }
  }, [session, isPending, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Email dan password wajib diisi.");
      return;
    }

    try {
      const { error: authError } = await authClient.signIn.email({
        email: email.trim(),
        password: password.trim(),
      });

      if (authError) {
        setError(authError.message || "Email atau kata sandi tidak sesuai.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal terhubung ke server. Periksa koneksi Anda.";
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50/80 px-4 py-12">
      <div className="w-full max-w-[380px] space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm ring-1 ring-zinc-800 mx-auto">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">
              Ngasir POS
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Sistem Kasir & Manajemen Toko UMKM
            </p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="border border-zinc-200 bg-white shadow-sm rounded-xl">
          <CardHeader className="pb-4 pt-6 px-6 border-b border-zinc-100">
            <div className="space-y-0.5">
              <h2 className="text-sm font-semibold text-zinc-900">Masuk ke Terminal Kasir</h2>
              <p className="text-xs text-zinc-500">
                Gunakan kredensial akun toko Anda
              </p>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-zinc-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@ngasir.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 text-xs bg-white border-zinc-200 focus-visible:ring-zinc-900"
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium text-zinc-700">
                    Kata Sandi
                  </Label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-9 text-xs bg-white border-zinc-200 pr-9 focus-visible:ring-zinc-900"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 font-medium">
                  {error}
                </div>
              )}

              <Button
                id="login-btn"
                type="submit"
                className="w-full h-9 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors mt-2"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Memverifikasi...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 w-full">
                    <span>Buka Kasir</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                )}
              </Button>

              {/* Sample Kredensial Demo */}
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-3 text-xs space-y-2 mt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-medium text-zinc-800">
                    <KeyRound className="h-3.5 w-3.5 text-zinc-500" />
                    <span>Akun Demo / Sample:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail("admin@ngasir.id");
                      setPassword("admin123");
                      setError("");
                    }}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                  >
                    Gunakan Akun Ini
                  </button>
                </div>
                <div className="font-mono text-[11px] bg-white rounded border border-zinc-200/80 p-2 text-zinc-600 space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Email:</span>
                    <span className="font-semibold text-zinc-700">admin@ngasir.id</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Sandi:</span>
                    <span className="font-semibold text-zinc-700">admin123</span>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Security badge & copyright */}
        <div className="flex flex-col items-center gap-2 text-center text-[11px] text-zinc-400">
          <div className="flex items-center gap-1.5 text-zinc-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Sesi Terenkripsi & Aman</span>
          </div>
          <p>© 2026 Ngasir · Point of Sale</p>
        </div>
      </div>
    </div>
  );
}
