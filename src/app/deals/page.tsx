import Link from 'next/link'
import { Plus, Handshake } from 'lucide-react'
import { buttonVariants } from '@/lib/button-variants'
import { DealCard } from '@/components/deals/DealCard'
import { createClient } from '@/lib/supabase/server'
import { getDeals } from '@/lib/queries/deals'

export const metadata = {
  title: 'All Deals — CSM Tracker',
}

export default async function DealsPage() {
  const supabase = await createClient()
  const deals = await getDeals(supabase)

  const totalDeals = deals.length
  const activeDeals = deals.filter((d) => d.status === 'active').length
  const totalOpenBlockers = deals.reduce((sum, d) => sum + (d._open_blocker_count ?? 0), 0)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All Deals</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage and track all client deals</p>
        </div>
        <Link href="/deals/new" className={buttonVariants()}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Deal
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-2xl font-bold text-slate-900">{totalDeals}</p>
          <p className="text-sm text-slate-500 mt-0.5">Total Deals</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-2xl font-bold text-green-600">{activeDeals}</p>
          <p className="text-sm text-slate-500 mt-0.5">Active Deals</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-2xl font-bold text-orange-500">{totalOpenBlockers}</p>
          <p className="text-sm text-slate-500 mt-0.5">Open Blockers</p>
        </div>
      </div>

      {/* Deal grid */}
      {deals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Handshake className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-600 mb-1">No deals yet</p>
          <p className="text-sm text-slate-400 mb-5">
            Create your first deal to get started.
          </p>
          <Link href="/deals/new" className={buttonVariants()}>
            <Plus className="h-4 w-4 mr-1.5" />
            Create Deal
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      )}
    </div>
  )
}
