import { useState } from 'react'
import { Clock, MapPin, Hash, ChevronDown, ChevronUp, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useOrders } from '../../hooks/useOrders'
import type { Order, OrderStatus } from '../../types'
import toast from 'react-hot-toast'

const STATUS_OPTIONS: { value: OrderStatus; label: string; badgeClass: string; btnClass: string }[] = [
  {
    value: 'new',
    label: 'New Order',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    btnClass: 'bg-blue-600 text-white',
  },
  {
    value: 'preparing',
    label: 'Preparing',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    btnClass: 'bg-amber-600 text-white',
  },
  {
    value: 'ready',
    label: 'Ready to Serve',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    btnClass: 'bg-emerald-600 text-white',
  },
  {
    value: 'completed',
    label: 'Completed',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    btnClass: 'bg-slate-700 text-white',
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
    badgeClass: 'bg-red-50 text-red-600 border-red-200',
    btnClass: 'bg-red-600 text-white',
  },
]

export default function AdminOrders() {
  const { orders, loading, error, updateStatus, refetch } = useOrders()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  const activeOrders = orders.filter(o => !['completed', 'cancelled'].includes(o.status))
  const pastOrders = orders.filter(o => ['completed', 'cancelled'].includes(o.status))

  const displayedOrders = filter === 'active' ? activeOrders : filter === 'past' ? pastOrders : orders

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 animate-pulse space-y-2">
            <div className="h-4 bg-slate-200 rounded w-1/4" />
            <div className="h-3 bg-slate-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-red-100 p-8">
        <p className="text-red-500 font-bold mb-3">{error}</p>
        <button onClick={refetch} className="btn-secondary text-xs">
          <RefreshCw size={14} /> Retry Loading
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Top summary & Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-extrabold text-slate-900 text-lg">Hotel Guest Orders</h2>
          <p className="text-xs text-slate-500">
            {activeOrders.length} active orders needing kitchen/service attention
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Filter tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({orders.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active ({activeOrders.length})
            </button>
            <button
              onClick={() => setFilter('past')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === 'past' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Past ({pastOrders.length})
            </button>
          </div>

          <button
            onClick={refetch}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh Orders"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {displayedOrders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8">
          <CheckCircle2 size={32} className="text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-slate-700 text-sm">No orders found</h3>
          <p className="text-xs text-slate-400 mt-1">
            Incoming customer orders from hotel tables will automatically show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedOrders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              expanded={expandedId === order.id}
              onToggle={() => setExpandedId(prev => (prev === order.id ? null : order.id))}
              onStatusChange={updateStatus}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function OrderCard({
  order,
  expanded,
  onToggle,
  onStatusChange,
}: {
  order: Order
  expanded: boolean
  onToggle: () => void
  onStatusChange: (id: string, status: OrderStatus) => Promise<void>
}) {
  const [updating, setUpdating] = useState(false)
  const statusInfo = STATUS_OPTIONS.find(s => s.value === order.status) ?? STATUS_OPTIONS[0]
  const isCompletedOrCancelled = ['completed', 'cancelled'].includes(order.status)

  const handleStatus = async (status: OrderStatus) => {
    if (updating || order.status === status) return
    setUpdating(true)
    try {
      await onStatusChange(order.id, status)
      toast.success(`Order ${order.order_number} marked as ${status}`)
    } catch {
      toast.error('Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div
      className={`bg-white rounded-xl border transition-all overflow-hidden ${
        isCompletedOrCancelled
          ? 'border-slate-200/60 opacity-80'
          : order.status === 'new'
          ? 'border-blue-300 ring-1 ring-blue-200 shadow-sm'
          : 'border-slate-200/90 shadow-sm'
      }`}
    >
      {/* Top Banner Row */}
      <div
        onClick={onToggle}
        className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/60 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Status badge with pulse if new */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusInfo.badgeClass}`}
          >
            {order.status === 'new' && (
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
            )}
            {statusInfo.label}
          </span>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900 text-sm flex items-center gap-1">
                <Hash size={13} className="text-slate-400" />
                {order.order_number}
              </span>
              <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                <MapPin size={12} />
                {order.table_number}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {new Date(order.created_at).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span>•</span>
              <span>
                {order.order_items?.reduce((s, i) => s + i.quantity, 0) || 0} items
              </span>
            </div>
          </div>
        </div>

        {/* Right side: Total in Rupees & toggle icon */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Amount</span>
            <span className="font-black text-slate-900 text-base">
              ₹{order.total_amount.toFixed(0)}
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>

      {/* Expanded Order Items Details & Action Controls */}
      {expanded && (
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Ordered Food Items
            </h4>
            <div className="bg-white rounded-xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
              {(order.order_items ?? []).map(item => (
                <div key={item.id} className="p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-slate-900 text-white rounded font-bold flex items-center justify-center text-[10px]">
                      {item.quantity}×
                    </span>
                    <span className="font-bold text-slate-800 text-sm">
                      {item.name_snapshot}
                    </span>
                  </div>
                  <span className="font-black text-slate-900 text-sm">
                    ₹{(item.price_snapshot * item.quantity).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Status Buttons */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Update Order Status
            </h4>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(opt => {
                const isCurrent = order.status === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleStatus(opt.value)}
                    disabled={updating || isCurrent}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isCurrent
                        ? `${opt.btnClass} ring-2 ring-offset-1 ring-slate-900 shadow-sm`
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    } disabled:opacity-60`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
