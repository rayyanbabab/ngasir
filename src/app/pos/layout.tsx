import { Sidebar, MobileNav } from "@/components/sidebar";

export default function POSLayout({ children }: { children: React.ReactNode }) {
  return (
    // Outer wrapper: sets the height boundary, prevents body scroll.
    // No flex here — Sidebar is position:fixed so it doesn't participate in flow.
    <div className="h-screen overflow-hidden bg-background">
      <Sidebar />

      {/* Inner wrapper: flex column, offset for the fixed sidebar */}
      <div className="flex flex-col h-full lg:pl-[260px]">
        {/* Mobile top bar — hidden on desktop via lg:hidden inside MobileNav */}
        <MobileNav />

        {/* Main content fills remaining height.
            min-h-0 is critical: without it, a flex child cannot shrink
            below its content size, which breaks ScrollArea. */}
        <main className="flex-1 min-h-0 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
