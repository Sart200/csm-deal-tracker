"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Handshake,
  AlertTriangle,
  LayoutTemplate,
  BarChart3,
  TrendingUp,
  ScrollText,
  Users,
  X,
} from "lucide-react"

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Deals", href: "/deals", icon: Handshake },
  { label: "Blockers", href: "/blockers", icon: AlertTriangle },
  { label: "Templates", href: "/templates", icon: LayoutTemplate },
  { label: "Performance", href: "/performance", icon: TrendingUp },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Activity Log", href: "/activity", icon: ScrollText },
  { label: "Team", href: "/team", icon: Users },
]

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col bg-slate-900 text-white">
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700/50">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-md bg-blue-500 flex items-center justify-center">
            <LayoutDashboard className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">CSM Tracker</p>
            <p className="text-xs text-slate-400 leading-tight">Fibr AI</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white md:hidden">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-700/50">
        <p className="text-xs text-slate-500 text-center">v1.2 · Internal use only</p>
      </div>
    </div>
  )
}
