import { useEffect, useState } from 'react'
import {
  Clock,
  Edit3,
  XCircle,
  CheckCircle2,
  Lock,
  Receipt,
  X,
  AlertTriangle,
} from 'lucide-react'
import type { Order } from '../types'

interface EditTimerModalProps {
  open: boolean
  order: Order | null
  remainingSeconds: number
  onClose: () => void
  onEdit: () => void
  onCancel: () => Promise<void>
  isCancelling?: boolean
}

export default function EditTimerModal({
  open,
  order,
  remainingSeconds,
  onClose,
  onEdit,
  onCancel,
  isCancelling = false,
}: EditTimerModalProps) {
  const [timeLeft, setTimeLeft] = useState<number>(remainingSeconds)
  const [showConfirmCancel, setShowConfirmCancel] = useState(false)

  // Sync internal countdown with remainingSeconds or decrement every second
  useEffect(() => {
    if (!open) {
      setShowConfirmCancel(false)
      return
    }

    setTimeLeft(remainingSeconds)

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [open, remainingSeconds])

  if (!open || !order) return null

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  const isExpired = timeLeft <= 0
  const progressPercent = Math.max(0, Math.min(100, (timeLeft / 120) * 100))

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 font-sans text-slate-800">
      {/* Semi-transparent dark backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={!isCancelling ? onClose : undefined}
      />

      {/* Pop-up Box */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Dismiss Button */}
        {!isCancelling && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors z-20"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        )}

        {/* Header with status badge */}
        <div className="p-6 pb-4 text-center bg-gradient-to-b from-amber-50/70 to-white">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 mb-3 shadow-inner">
            {isExpired ? (
              <Lock size={28} className="text-slate-500" />
            ) : (
              <Clock size={28} className="text-amber-600 animate-pulse" />
            )}
          </div>

          <h3 className="text-xl font-black text-slate-900 tracking-tight">
            {isExpired ? 'Order Sent to Kitchen' : 'Order Placed! 2-Minute Window'}
          </h3>

          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            {isExpired
              ? 'The 2-minute window has closed. Your food is now being freshly prepared.'
              : 'You can change dishes or cancel your order within the 2-minute timer.'}
          </p>

          {/* Large Countdown Display */}
          <div className="mt-4 p-4 rounded-2xl bg-slate-900 text-white shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-semibold uppercase tracking-wider">
                {isExpired ? 'Status' : 'Timer Left'}
              </span>
              <span className="text-[11px] text-amber-400 font-medium">
                {isExpired ? 'Locked' : 'Fast Table Service'}
              </span>
            </div>

            <div className="flex items-center justify-center gap-3 py-1">
              {!isExpired && (
                <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
              )}
              <span className="text-3xl font-black font-mono tracking-wider text-amber-400">
                {isExpired ? '0:00' : formatTime(timeLeft)}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full transition-all duration-1000 ${
                  timeLeft <= 30 ? 'bg-red-500' : 'bg-amber-400'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Order Quick Summary */}
        <div className="px-6 py-3 bg-slate-50 border-y border-slate-100 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
              Order No.
            </span>
            <span className="font-bold text-slate-800">{order.order_number}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
              Table / Room
            </span>
            <span className="font-bold text-slate-800">{order.table_number}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
              Total Amount
            </span>
            <span className="font-black text-amber-700 text-sm">
              ₹{order.total_amount.toFixed(0)}
            </span>
          </div>
        </div>

        {/* Action Buttons Section */}
        <div className="p-6 pt-4 space-y-2.5">
          {!isExpired ? (
            <>
              {/* Normal State: Edit & Cancel Options */}
              {!showConfirmCancel ? (
                <>
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Edit Order Button */}
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        onEdit()
                      }}
                      className="py-3 px-4 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 size={15} />
                      <span>Edit Order</span>
                    </button>

                    {/* Cancel Order Button */}
                    <button
                      type="button"
                      onClick={() => setShowConfirmCancel(true)}
                      className="py-3 px-4 bg-red-50 hover:bg-red-100 active:scale-95 text-red-600 font-extrabold text-xs rounded-xl border border-red-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <XCircle size={15} />
                      <span>Cancel Order</span>
                    </button>
                  </div>

                  {/* Keep Order & View Receipt */}
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Receipt size={14} />
                    <span>Keep Order & View Receipt</span>
                  </button>
                </>
              ) : (
                /* Cancel Confirmation State */
                <div className="bg-red-50 p-4 rounded-2xl border border-red-200 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-start gap-2.5 text-left">
                    <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-extrabold text-xs text-red-900">
                        Cancel this order?
                      </p>
                      <p className="text-[11px] text-red-700 mt-0.5">
                        This will notify the kitchen immediately and cancel order #{order.order_number}.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowConfirmCancel(false)}
                      disabled={isCancelling}
                      className="flex-1 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors"
                    >
                      No, Keep It
                    </button>
                    <button
                      type="button"
                      onClick={onCancel}
                      disabled={isCancelling}
                      className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1"
                    >
                      {isCancelling ? (
                        <span>Cancelling…</span>
                      ) : (
                        <>
                          <XCircle size={14} />
                          <span>Yes, Cancel</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Expired State: Order Locked */
            <div className="space-y-3">
              <div className="bg-slate-100 p-3 rounded-xl flex items-center gap-2 text-xs text-slate-600">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <span>Preparation in progress. Order can no longer be edited or cancelled.</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <Receipt size={14} />
                <span>View Final Receipt</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
