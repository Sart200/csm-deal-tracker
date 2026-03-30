"use client"

import { useState } from "react"
import { Menu } from "lucide-react"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Sidebar } from "./Sidebar"
import { Toaster } from "@/components/ui/sonner"

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 shrink-0 flex-col h-full">
        <Sidebar />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-56">
          <Sidebar onClose={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-slate-600 hover:text-slate-900"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold text-slate-800 text-sm">CSM Tracker</span>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>

      <Toaster richColors position="top-right" />
    </div>
  )
}
