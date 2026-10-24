import { useState, useMemo, useEffect } from 'react'
import {
  ShoppingCart,
  Plus,
  Minus,
  Search,
  Check,
  Utensils,
  ShieldCheck,
  Sparkles,
  Clock,
  Receipt,
  Edit3,
} from 'lucide-react'
import { useMenuItems } from '../hooks/useMenuItems'
import { useCart } from '../contexts/CartContext'
import { getActiveCustomerOrder, saveActiveCustomerOrder } from '../lib/storage'
import CartDrawer from '../components/CartDrawer'
import CheckoutModal from '../components/CheckoutModal'
import type { FoodItem, Order } from '../types'

const EDIT_WINDOW_SECONDS = 120

export default function CustomerPage() {
  const { items, loading, error } = useMenuItems()
  const { totalItems, totalAmount, addItem } = useCart()
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [search, setSearch] = useState('')

  // Active customer order state (for 2-minute editing & status tracking)
  const [activeOrder, setActiveOrder] = useState<Order | null>(() => getActiveCustomerOrder())
  const [activeOrderTimeLeft, setActiveOrderTimeLeft] = useState<number>(0)

  // Listen to active order changes across tabs/windows
  useEffect(() => {
    const handleActiveOrderChanged = (e: Event) => {
      const customEvent = e as CustomEvent<Order | null>
      setActiveOrder(customEvent.detail ?? getActiveCustomerOrder())
    }
    window.addEventListener('hotel_active_order_changed', handleActiveOrderChanged)
    return () => window.removeEventListener('hotel_active_order_changed', handleActiveOrderChanged)
  }, [])

  // Timer for active order banner
  useEffect(() => {
    if (!activeOrder) {
      setActiveOrderTimeLeft(0)
      return
    }

    const calcTime = () => {
      const created = new Date(activeOrder.created_at).getTime()
      const elapsed = Math.floor((Date.now() - created) / 1000)
      const left = Math.max(0, EDIT_WINDOW_SECONDS - elapsed)
      setActiveOrderTimeLeft(left)
    }

    calcTime()
    const interval = setInterval(calcTime, 1000)
    return () => clearInterval(interval)
  }, [activeOrder])

  const categories = useMemo(() => {
    const cats = Array.from(new Set(items.map(i => i.category).filter(Boolean))) as string[]
    return ['All', ...cats.sort()]
  }, [items])

  const filtered = useMemo(() => {
    let list = items
    if (activeCategory !== 'All') list = list.filter(i => i.category === activeCategory)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(i =>
        i.name.toLowerCase().includes(q) ||
        (i.description ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [items, activeCategory, search])

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Top Welcome Bar (No admin links) */}
      <div className="bg-slate-900 text-slate-200 text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium tracking-wide">
              Live Hotel Kitchen • Fresh Dine-in Ordering
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Fast Table Service
          </span>
        </div>
      </div>

      {/* Main Luxury Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-sm/50 backdrop-blur-md bg-white/95">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-400 text-white flex items-center justify-center shadow-sm">
              <Utensils size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-slate-900 text-lg tracking-tight">
                  Royal Palm Hotel
                </h1>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Menu
                </span>
              </div>
              <p className="text-xs text-slate-500 font-normal">
                Order directly from your table • Fast kitchen service
              </p>
            </div>
          </div>

          {/* Cart Trigger */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-sm transition-all shadow-sm shadow-amber-500/25"
            aria-label={`View order cart, ${totalItems} items`}
          >
            <ShoppingCart size={18} />
            <span className="hidden sm:inline">Order Cart</span>
            {totalItems > 0 && (
              <span className="bg-slate-950 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                {totalItems}
              </span>
            )}
            {totalAmount > 0 && (
              <span className="hidden sm:inline border-l border-amber-400/50 pl-2 text-xs font-semibold">
                ₹{totalAmount.toFixed(0)}
              </span>
            )}
          </button>
        </div>

        {/* Search & Category Filter Navigation */}
        <div className="max-w-5xl mx-auto px-4 pb-3 space-y-3">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search food by name, ingredients (e.g. Biryani, Paneer, Naan)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100/90 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-amber-500 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded-md"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Tabs */}
          {categories.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-semibold">
              {categories.map(cat => {
                const isActive = activeCategory === cat
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-lg transition-all duration-150 ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                    }`}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </header>

      {/* Main Food Menu Section */}
      <main className="max-w-5xl mx-auto w-full px-4 py-6 flex-1">
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-3 animate-pulse"
              >
                <div className="h-5 bg-slate-200 rounded w-1/2" />
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-4 bg-slate-200 rounded w-1/4" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-16 bg-white rounded-2xl border border-red-100 p-8">
            <p className="text-red-500 font-bold mb-1">Failed to load menu</p>
            <p className="text-xs text-slate-400">{error}</p>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/70 p-8 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 text-xl font-bold">
              🔍
            </div>
            <h3 className="font-bold text-slate-800 text-base mb-1">No food items found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {search
                ? `No dishes matched "${search}". Try checking the spelling or browse all categories.`
                : 'No food items are currently available in this category.'}
            </p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-6">
            {/* Minimal Sub-heading */}
            <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-200/60 pb-2">
              <span className="font-semibold uppercase tracking-wider text-slate-700">
                {activeCategory} ({filtered.length} items)
              </span>
              <span>All prices listed in Indian Rupees (₹)</span>
            </div>

            {/* Menu Grid without Images */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filtered.map(item => (
                <FoodItemRow key={item.id} item={item} onAdd={addItem} />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Persistent Active Order Banner (with 2-minute live edit button) */}
      {activeOrder && (
        <div className="sticky bottom-4 z-30 px-4 max-w-lg mx-auto w-full transition-all">
          <div className="bg-slate-900 text-white rounded-2xl p-3.5 shadow-2xl flex items-center justify-between border border-slate-800 backdrop-blur-md">
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-bold text-xs text-white truncate">
                  Active Order {activeOrder.order_number}
                </span>
                <span className="bg-slate-800 text-amber-400 text-[10px] px-2 py-0.5 rounded font-bold">
                  {activeOrder.table_number}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                {activeOrderTimeLeft > 0 ? (
                  <>
                    <Clock size={12} className="text-amber-400" />
                    <span className="text-amber-300 font-semibold">
                      {formatTimer(activeOrderTimeLeft)} remaining to edit
                    </span>
                  </>
                ) : (
                  <>
                    <Check size={12} className="text-emerald-400" />
                    <span>Kitchen is preparing your order</span>
                  </>
                )}
              </p>
            </div>

            <button
              onClick={() => setCheckoutOpen(true)}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm shrink-0"
            >
              {activeOrderTimeLeft > 0 ? <Edit3 size={13} /> : <Receipt size={13} />}
              <span>{activeOrderTimeLeft > 0 ? 'Edit Order' : 'Receipt'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Bottom Cart Bar for when items are in cart */}
      {!activeOrder && totalItems > 0 && (
        <div className="sticky bottom-4 z-30 px-4 max-w-md mx-auto w-full transition-all">
          <div className="bg-slate-900 text-white rounded-2xl p-3.5 shadow-2xl flex items-center justify-between border border-slate-800 backdrop-blur-md">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                  {totalItems}
                </span>
                <span className="text-xs font-medium text-slate-300">
                  Total:{' '}
                  <strong className="text-white text-sm font-bold">
                    ₹{totalAmount.toFixed(0)}
                  </strong>
                </span>
              </div>
            </div>

            <button
              onClick={() => setCheckoutOpen(true)}
              className="bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-extrabold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
            >
              <span>Order Now</span>
              <Check size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Minimal Footer (Completely removed any admin link) */}
      <footer className="mt-auto border-t border-slate-200/80 bg-white py-6 px-4 text-center text-xs text-slate-500 space-y-2">
        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-600 font-semibold">
          <Utensils size={14} className="text-amber-500" />
          <span>Royal Palm Hotel Dining & Room Service</span>
        </p>
        <p className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
          <ShieldCheck size={13} className="text-emerald-500" />
          <span>Freshly Prepared • Direct Kitchen Service</span>
        </p>
      </footer>

      {/* Slide-in Cart & Checkout/Receipt/Edit Modal */}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        activeOrder={activeOrder}
        onOrderUpdated={order => {
          setActiveOrder(order)
          saveActiveCustomerOrder(order)
        }}
        menuItems={items}
      />
    </div>
  )
}

/**
 * Minimalist Food Item Card without photos
 * Highlight: Name, Category/Veg Badge, Description, and Price in Rupees (₹)
 */
function FoodItemRow({
  item,
  onAdd,
}: {
  item: FoodItem
  onAdd: (f: FoodItem) => void
}) {
  const { items: cartItems, updateQuantity, removeItem } = useCart()
  const cartItem = cartItems.find(i => i.food_item.id === item.id)
  const qty = cartItem?.quantity ?? 0

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 hover:border-amber-300/80 hover:shadow-md transition-all duration-150 flex flex-col justify-between group">
      <div>
        {/* Top meta: Category chip */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"
              title="Fresh Hotel Kitchen Dish"
            />
            {item.category && (
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {item.category}
              </span>
            )}
          </div>
          {item.price > 250 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
              <Sparkles size={11} /> Chef's Special
            </span>
          )}
        </div>

        {/* Food Name */}
        <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-amber-700 transition-colors">
          {item.name}
        </h3>

        {/* Food Description */}
        {item.description && (
          <p className="text-slate-500 text-xs sm:text-sm mt-1 leading-relaxed line-clamp-2">
            {item.description}
          </p>
        )}
      </div>

      {/* Bottom Bar: Price in Rupees & Add Button */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
        <div>
          <span className="text-xs text-slate-400 block font-medium">Price</span>
          <span className="font-black text-slate-900 text-lg sm:text-xl tracking-tight">
            ₹{item.price.toFixed(0)}
          </span>
        </div>

        <div>
          {qty === 0 ? (
            <button
              onClick={() => onAdd(item)}
              className="px-4 py-2 bg-slate-900 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl transition-all duration-150 flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={14} />
              <span>Add</span>
            </button>
          ) : (
            <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50 shadow-inner">
              <button
                onClick={() =>
                  qty === 1 ? removeItem(item.id) : updateQuantity(item.id, qty - 1)
                }
                className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 text-slate-700 transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus size={13} />
              </button>
              <span className="w-8 text-center text-xs font-black text-slate-900">
                {qty}
              </span>
              <button
                onClick={() => updateQuantity(item.id, qty + 1)}
                className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 text-slate-700 transition-colors"
                aria-label="Increase quantity"
              >
                <Plus size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
