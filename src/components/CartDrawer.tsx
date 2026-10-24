import { useState, useRef, useEffect } from 'react'
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import CheckoutModal from './CheckoutModal'

interface CartDrawerProps {
  open: boolean
  onClose: () => void
}

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, updateQuantity, removeItem, totalAmount, totalItems } = useCart()
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center">
              <ShoppingBag size={17} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">Your Order Cart</h2>
              <p className="text-xs text-gray-500">{totalItems} items selected</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200/60 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-gray-100">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
              <div className="w-16 h-16 rounded-full bg-orange-50 text-brand-600 flex items-center justify-center text-2xl font-bold">
                🍽️
              </div>
              <p className="font-bold text-gray-800 text-base">Your cart is empty</p>
              <p className="text-xs text-gray-400 max-w-xs">
                Select your favorite dishes from our menu to begin your order.
              </p>
            </div>
          ) : (
            items.map(({ food_item, quantity }) => (
              <div key={food_item.id} className="py-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm truncate">
                      {food_item.name}
                    </span>
                  </div>
                  <p className="text-brand-600 font-extrabold text-sm mt-0.5">
                    ₹{food_item.price}{' '}
                    <span className="text-xs text-gray-400 font-normal">
                      (₹{(food_item.price * quantity).toFixed(0)} total)
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                    <button
                      onClick={() =>
                        quantity === 1
                          ? removeItem(food_item.id)
                          : updateQuantity(food_item.id, quantity - 1)
                      }
                      className="w-7 h-7 flex items-center justify-center hover:bg-gray-200 text-gray-600 transition-colors"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-gray-900">
                      {quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(food_item.id, quantity + 1)}
                      className="w-7 h-7 flex items-center justify-center hover:bg-gray-200 text-gray-600 transition-colors"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(food_item.id)}
                    className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-500 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 block">
                  Total Bill
                </span>
                <span className="text-xs text-gray-400">Taxes included</span>
              </div>
              <span className="font-extrabold text-2xl text-brand-700">
                ₹{totalAmount.toFixed(0)}
              </span>
            </div>

            <button
              onClick={() => {
                onClose()
                setTimeout(() => setCheckoutOpen(true), 250)
              }}
              className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-brand-600/20 flex items-center justify-center gap-2"
            >
              <span>Enter Table & Place Order</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>

      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
    </>
  )
}
