'use client'

import Link from 'next/link'
import { Activity } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ActivityTimeline } from './ActivityTimeline'
import type { ActivityLogWithActor } from '@/types'
import { useState } from 'react'

interface ActivityDrawerProps {
  logs: ActivityLogWithActor[]
}

export function ActivityDrawer({ logs }: ActivityDrawerProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        title="Recent activity"
      >
        <Activity className="h-4 w-4" />
        <span className="hidden sm:inline">Activity</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-80 sm:max-w-80 flex flex-col p-0 bg-background border-l border-border">
          <SheetHeader className="px-4 py-3 border-b border-border">
            <SheetTitle className="text-sm font-medium text-foreground">Recent Activity</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            <ActivityTimeline logs={logs} />
          </div>

          <div className="px-4 py-3 border-t border-border shrink-0">
            <Link
              href="/activity"
              onClick={() => setOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View full log →
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
