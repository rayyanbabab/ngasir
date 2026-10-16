"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Settings,
  LogOut,
  Menu,
  X,
  Store,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    badge: null,
  },
  {
    label: "Kasir (POS)",
    href: "/pos",
    icon: ShoppingCart,
    badge: "Utama",
  },
  {
    label: "Inventaris",
    href: "/inventory",
    icon: Package,
    badge: null,
  },
  {
    label: "Riwayat",
    href: "/transactions",
    icon: Receipt,
    badge: null,
  },
];

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const [storeName] = useState<string>(() => {
    if (typeof window === "undefined") return "Toko Kasir";
    try {
      const raw = localStorage.getItem("ngasir_settings");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.storeName) return parsed.storeName;
      }
    } catch { /* ignore */ }
    return "Toko Kasir";
  });
  const [ownerName] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("ngasir_settings");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.ownerName) return parsed.ownerName;
      }
    } catch { /* ignore */ }
    return null;
  });

  const userName = ownerName || session?.user?.name || "Kasir";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await authClient.signOut();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <div className="flex h-full flex-col bg-zinc-50/80 border-r border-zinc-200">
      {/* Brand Header */}
      <div className="px-5 py-4 border-b border-zinc-200/80">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white shadow-sm ring-1 ring-zinc-800">
            <Store className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-semibold tracking-tight text-zinc-900 truncate">
                {storeName}
              </h1>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-medium text-zinc-500 tracking-tight">
                POS Aktif · Online
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        <div className="px-3 pb-2">
          <p className="text-[11px] font-semibold tracking-wider uppercase text-zinc-400">
            Menu Kasir
          </p>
        </div>

        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
                isActive
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <item.icon
                  className={`h-4 w-4 transition-colors ${
                    isActive ? "text-white" : "text-zinc-400 group-hover:text-zinc-700"
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    isActive
                      ? "bg-zinc-800 text-zinc-200"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        <div className="pt-4 px-3 pb-2">
          <p className="text-[11px] font-semibold tracking-wider uppercase text-zinc-400">
            Sistem
          </p>
        </div>

        <Link
          href="/settings"
          onClick={onNavClick}
          className={`group flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
            pathname === "/settings"
              ? "bg-zinc-900 text-white shadow-sm"
              : "text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-900"
          }`}
        >
          <Settings
            className={`h-4 w-4 transition-colors ${
              pathname === "/settings" ? "text-white" : "text-zinc-400 group-hover:text-zinc-700"
            }`}
          />
          <span>Pengaturan Toko</span>
        </Link>
      </nav>

      {/* User Session Footer */}
      <div className="p-3 border-t border-zinc-200/70 bg-white/60">
        <div className="flex items-center justify-between gap-2 rounded-lg p-2 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar className="h-8 w-8 ring-1 ring-zinc-200">
              <AvatarFallback className="bg-zinc-100 text-zinc-800 text-[11px] font-semibold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-900 truncate">{userName}</p>
              <p className="text-[11px] text-zinc-500 truncate">{session?.user?.email || "Admin Kasir"}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors flex-none"
            onClick={handleLogout}
            disabled={loggingOut}
            title="Keluar dari Akun"
          >
            {loggingOut ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <LogOut className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex lg:w-[260px] lg:flex-col lg:fixed lg:inset-y-0 z-40">
      <SidebarContent />
    </aside>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="flex lg:hidden items-center justify-between border-b border-zinc-200 bg-white/90 backdrop-blur-md px-4 py-2.5 sticky top-0 z-40">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 text-white">
          <Store className="h-3.5 w-3.5" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-zinc-900">Ngasir</span>
        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-medium border border-emerald-200/50">
          POS
        </span>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={<Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-700" />}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </SheetTrigger>
        <SheetContent side="left" className="w-[260px] p-0 border-r border-zinc-200" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigasi Utama</SheetTitle>
          <SidebarContent onNavClick={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  );
}
