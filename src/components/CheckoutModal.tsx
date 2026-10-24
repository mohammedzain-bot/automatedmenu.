import { useState, useRef, useEffect } from 'react'
import { X, CheckCircle2, Clock, Hash, MapPin, Receipt, ShieldCheck } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { supabase, IS_DEMO } from '../lib/supabase'
import { addLocalOrder } from '../lib/storage'
import toast from 'react-hot-toast'
import type { Order, OrderItem } from '../types'

interface CheckoutModalProps {
  open: boolean
  onClose: () => void
}

export default function CheckoutModal({ open, onClose }: CheckoutModalProps) {
  const { items, totalAmount, clearCart } = useCart()
  const [tableNumber, setTableNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null)
  const submitRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && !placedOrder) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, placedOrder])

  useEffect(() => {
    if (!open) {
      setTableNumber('')
      setPlacedOrder(null)
      submitRef.current = false
    }
  }, [open])

  const handleSubmit = async () => {
    if (submitRef.current || submitting) return
    if (!tableNumber.trim()) {
      toast.error('Please enter your table or room number')
      inputRef.current?.focus()
      return
    }
    if (items.length === 0) {
      toast.error('Your order cart is empty')
      return
    }

    submitRef.current = true
    setSubmitting(true)

    try {
      const orderNumber = `ORD-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
      const now = new Date().toISOString()
      const orderId = `order-${Date.now().toString(36)}`

      const orderItemsSnapshot: OrderItem[] = items.map(({ food_item, quantity }, index) => ({
        id: `ord-item-${Date.now()}-${index}`,
        order_id: orderId,
        food_item_id: food_item.id,
        name_snapshot: food_item.name,
        price_snapshot: food_item.price,
        quantity,
      }))

      const fullOrder: Order = {
        id: orderId,
        order_number: orderNumber,
        table_number: tableNumber.trim(),
        status: 'new',
        total_amount: totalAmount,
        created_at: now,
        updated_at: now,
        order_items: orderItemsSnapshot,
      }

      if (IS_DEMO) {
        // Save locally and trigger instant realtime sync
        addLocalOrder(fullOrder)
      } else {
        // Insert order in Supabase
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert({
            order_number: orderNumber,
            table_number: tableNumber.trim(),
            status: 'new',
            total_amount: totalAmount,
            created_at: now,
            updated_at: now,
          })
          .select()
          .single()

        if (orderError) throw orderError
        const order = orderData as { id: string; order_number: string; table_number: string; status: string; total_amount: number; created_at: string; updated_at: string }

        // Insert order items
        const payload = items.map(({ food_item, quantity }) => ({
          order_id: order.id,
          food_item_id: food_item.id,
          name_snapshot: food_item.name,
          price_snapshot: food_item.price,
          quantity,
        }))

        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .insert(payload)
          .select()

        if (itemsError) throw itemsError

        fullOrder.id = order.id
        fullOrder.order_items = (itemsData ?? []) as OrderItem[]
      }

      setPlacedOrder(fullOrder)
      clearCart()
      toast.success('Order placed successfully! Sent to kitchen.')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to place order. Please try again.'
      toast.error(msg)
      submitRef.current = false
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-0 sm:px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={!submitting ? handleClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0 bg-gray-50/50">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">
              {placedOrder ? 'Order Confirmed' : 'Confirm Order'}
            </h2>
            <p className="text-xs text-gray-500">
              {placedOrder ? 'Your food is now being prepared' : 'Enter table number to place order'}
            </p>
          </div>
          {!submitting && (
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {!placedOrder ? (
            /* Order Summary Form */
            <div className="space-y-5">
              {/* Table number input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                  Table Number / Room No. <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-600" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="e.g. Table 7 or Room 204"
                    value={tableNumber}
                    onChange={e => setTableNumber(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-gray-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Items Summary */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Order Items ({items.reduce((s, i) => s + i.quantity, 0)})
                  </h3>
                </div>
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden bg-gray-50/40">
                  {items.map(({ food_item, quantity }) => (
                    <div
                      key={food_item.id}
                      className="flex items-center justify-between p-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-3">
                        <span className="w-5 h-5 bg-brand-100 text-brand-700 text-xs font-bold rounded flex items-center justify-center shrink-0">
                          {quantity}×
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {food_item.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            ₹{food_item.price} each
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
                        ₹{(food_item.price * quantity).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Calculation */}
              <div className="bg-brand-50/60 border border-brand-100 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-brand-900/70 block">
                    Total Amount
                  </span>
                  <span className="text-xs text-gray-500">All taxes included</span>
                </div>
                <span className="font-extrabold text-2xl text-brand-700">
                  ₹{totalAmount.toFixed(0)}
                </span>
              </div>
            </div>
          ) : (
            /* Digital Receipt */
            <div className="space-y-5">
              {/* Success Badge */}
              <div className="text-center pb-4 border-b border-dashed border-gray-200">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="font-bold text-xl text-gray-900">Order Received!</h3>
                <p className="text-gray-500 text-xs mt-1">
                  Sent to the hotel kitchen. Please keep this receipt handy.
                </p>
              </div>

              {/* Receipt metadata grid */}
              <div className="grid grid-cols-2 gap-2.5 text-left">
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="flex items-center gap-1 text-gray-400 text-xs mb-1">
                    <Hash size={12} />
                    <span>Order No.</span>
                  </div>
                  <p className="font-bold text-gray-900 text-sm tracking-wide">
                    {placedOrder.order_number}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="flex items-center gap-1 text-gray-400 text-xs mb-1">
                    <MapPin size={12} />
                    <span>Table</span>
                  </div>
                  <p className="font-bold text-gray-900 text-sm">
                    {placedOrder.table_number}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="flex items-center gap-1 text-gray-400 text-xs mb-1">
                    <Clock size={12} />
                    <span>Order Time</span>
                  </div>
                  <p className="font-bold text-gray-900 text-sm">
                    {new Date(placedOrder.created_at).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="flex items-center gap-1 text-gray-400 text-xs mb-1">
                    <Receipt size={12} />
                    <span>Status</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Kitchen Received
                  </span>
                </div>
              </div>

              {/* Item snapshot list */}
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-gray-100/70 px-4 py-2.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-600">
                  <span>Ordered Items</span>
                  <span>Amount</span>
                </div>
                <div className="divide-y divide-gray-100 bg-white">
                  {placedOrder.order_items.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-4 py-2.5 text-sm"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{item.name_snapshot}</p>
                        <p className="text-xs text-gray-500">
                          ₹{item.price_snapshot} × {item.quantity}
                        </p>
                      </div>
                      <span className="font-bold text-gray-900">
                        ₹{(item.price_snapshot * item.quantity).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 bg-brand-50 flex items-center justify-between border-t border-brand-100">
                  <span className="font-bold text-gray-900">Total in Rupees</span>
                  <span className="font-extrabold text-xl text-brand-700">
                    ₹{placedOrder.total_amount.toFixed(0)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1 text-gray-400 text-xs">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>Verified Hotel Dining Receipt</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Action */}
        <div className="p-4 border-t border-gray-100 shrink-0 bg-white">
          {!placedOrder ? (
            <button
              onClick={handleSubmit}
              disabled={submitting || items.length === 0 || !tableNumber.trim()}
              className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 active:scale-[0.99] text-white font-bold text-base rounded-xl transition-all shadow-md shadow-brand-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting to Kitchen…</span>
                </>
              ) : (
                <>
                  <span>Place Order • ₹{totalAmount.toFixed(0)}</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleClose}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-sm rounded-xl transition-all"
            >
              Done & Return to Menu
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
