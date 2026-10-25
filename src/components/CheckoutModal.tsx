import { useState, useRef, useEffect, useMemo } from 'react'
import {
  X,
  CheckCircle2,
  Clock,
  Hash,
  MapPin,
  Receipt,
  ShieldCheck,
  Edit3,
  Plus,
  Minus,
  Trash2,
  Lock,
  RotateCcw,
  XCircle,
} from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { supabase, IS_DEMO } from '../lib/supabase'
import {
  addLocalOrder,
  updateLocalOrder,
  updateLocalOrderStatus,
  saveActiveCustomerOrder,
} from '../lib/storage'
import toast from 'react-hot-toast'
import EditTimerModal from './EditTimerModal'
import type { Order, OrderItem, FoodItem } from '../types'

const EDIT_WINDOW_SECONDS = 120 // 2 minutes

interface EditableItem {
  id?: string
  food_item_id: string
  name_snapshot: string
  price_snapshot: number
  quantity: number
}

interface CheckoutModalProps {
  open: boolean
  onClose: () => void
  activeOrder?: Order | null
  onOrderUpdated?: (order: Order | null) => void
  menuItems?: FoodItem[]
}

export default function CheckoutModal({
  open,
  onClose,
  activeOrder,
  onOrderUpdated,
  menuItems = [],
}: CheckoutModalProps) {
  const { items, totalAmount, clearCart } = useCart()
  const [tableNumber, setTableNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [placedOrder, setPlacedOrder] = useState<Order | null>(activeOrder ?? null)
  const [isEditing, setIsEditing] = useState(false)
  const [editableItems, setEditableItems] = useState<EditableItem[]>([])
  const [editableTable, setEditableTable] = useState('')
  const [selectedAddDishId, setSelectedAddDishId] = useState<string>('')
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0)
  const [showTimerModal, setShowTimerModal] = useState<boolean>(false)

  const submitRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync active order if passed from outside
  useEffect(() => {
    if (activeOrder) {
      setPlacedOrder(activeOrder)
    }
  }, [activeOrder])

  // Focus table input on checkout open
  useEffect(() => {
    if (open && !placedOrder) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, placedOrder])

  // Reset states when closed
  useEffect(() => {
    if (!open) {
      setIsEditing(false)
      submitRef.current = false
    }
  }, [open])

  // 2-minute countdown timer calculation
  useEffect(() => {
    if (!placedOrder) {
      setRemainingSeconds(0)
      return
    }

    const calculateRemaining = () => {
      const orderTime = new Date(placedOrder.created_at).getTime()
      const elapsedSeconds = Math.floor((Date.now() - orderTime) / 1000)
      const left = Math.max(0, EDIT_WINDOW_SECONDS - elapsedSeconds)
      setRemainingSeconds(left)

      // If timer expires while in edit mode, exit edit mode safely
      if (left === 0 && isEditing) {
        setIsEditing(false)
        toast.error('The 2-minute edit window has expired. Order is locked.')
      }
    }

    calculateRemaining()
    const timer = setInterval(calculateRemaining, 1000)
    return () => clearInterval(timer)
  }, [placedOrder, isEditing])

  const canEdit = useMemo(() => {
    if (!placedOrder) return false
    return remainingSeconds > 0 && placedOrder.status === 'new'
  }, [placedOrder, remainingSeconds])

  // Format mm:ss
  const formatTimeLeft = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  // Initial order submission
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
        addLocalOrder(fullOrder)
      } else {
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
        const order = orderData as {
          id: string
          order_number: string
          table_number: string
          status: string
          total_amount: number
          created_at: string
          updated_at: string
        }

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
      saveActiveCustomerOrder(fullOrder)
      onOrderUpdated?.(fullOrder)
      clearCart()
      setShowTimerModal(true)
      toast.success('Order placed! You have 2 minutes to edit or cancel.')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to place order. Please try again.'
      toast.error(msg)
      submitRef.current = false
    } finally {
      setSubmitting(false)
    }
  }

  // Cancel order within 2-minute window
  const handleCancelOrder = async () => {
    if (!placedOrder) return

    // 1. Strict 2-minute security check
    const orderTime = new Date(placedOrder.created_at).getTime()
    if (Date.now() - orderTime > EDIT_WINDOW_SECONDS * 1000) {
      toast.error('The 2-minute cancellation window has passed. Order is locked.')
      return
    }

    if (placedOrder.status !== 'new') {
      toast.error('Kitchen has already started preparing your food.')
      return
    }

    setIsCancelling(true)

    try {
      const now = new Date().toISOString()
      if (IS_DEMO) {
        updateLocalOrderStatus(placedOrder.id, 'cancelled')
      } else {
        const { error: cancelErr } = await supabase
          .from('orders')
          .update({
            status: 'cancelled',
            updated_at: now,
          })
          .eq('id', placedOrder.id)

        if (cancelErr) throw cancelErr
      }

      saveActiveCustomerOrder(null)
      onOrderUpdated?.(null)
      setPlacedOrder(null)
      setShowTimerModal(false)
      setIsEditing(false)
      toast.success(`Order ${placedOrder.order_number} has been cancelled.`)
      onClose()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to cancel order. Please try again.'
      toast.error(msg)
    } finally {
      setIsCancelling(false)
    }
  }

  // Start editing mode
  const startEditing = () => {
    if (!placedOrder) return

    // Strict 2-minute security check
    const orderTime = new Date(placedOrder.created_at).getTime()
    if (Date.now() - orderTime > EDIT_WINDOW_SECONDS * 1000) {
      toast.error('The 2-minute edit window has passed. Order is locked.')
      return
    }

    if (placedOrder.status !== 'new') {
      toast.error('Kitchen has already started preparing your food.')
      return
    }

    setEditableTable(placedOrder.table_number)
    setEditableItems(
      placedOrder.order_items.map(item => ({
        id: item.id,
        food_item_id: item.food_item_id ?? '',
        name_snapshot: item.name_snapshot,
        price_snapshot: item.price_snapshot,
        quantity: item.quantity,
      }))
    )
    setSelectedAddDishId('')
    setIsEditing(true)
  }

  // Modify quantity inside edit mode
  const handleUpdateEditableQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      setEditableItems(prev => prev.filter((_, idx) => idx !== index))
    } else {
      setEditableItems(prev =>
        prev.map((item, idx) => (idx === index ? { ...item, quantity: newQty } : item))
      )
    }
  }

  // Add another dish while editing
  const handleAddDishToOrder = () => {
    if (!selectedAddDishId) return
    const dish = menuItems.find(m => m.id === selectedAddDishId)
    if (!dish) return

    setEditableItems(prev => {
      const existing = prev.find(i => i.food_item_id === dish.id)
      if (existing) {
        return prev.map(i =>
          i.food_item_id === dish.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [
        ...prev,
        {
          food_item_id: dish.id,
          name_snapshot: dish.name,
          price_snapshot: dish.price,
          quantity: 1,
        },
      ]
    })
    setSelectedAddDishId('')
  }

  // Calculated total while editing
  const editableTotal = useMemo(() => {
    return editableItems.reduce((sum, item) => sum + item.price_snapshot * item.quantity, 0)
  }, [editableItems])

  // Save modified order
  const handleSaveEdit = async () => {
    if (!placedOrder) return

    // 1. Strict Security Validation: Check 2-minute window
    const orderTime = new Date(placedOrder.created_at).getTime()
    if (Date.now() - orderTime > EDIT_WINDOW_SECONDS * 1000) {
      toast.error('The 2-minute edit window has expired. Edits cannot be saved.')
      setIsEditing(false)
      return
    }

    // 2. Validate table number and items
    if (!editableTable.trim()) {
      toast.error('Table number cannot be empty.')
      return
    }

    if (editableItems.length === 0) {
      toast.error('Order must contain at least 1 item.')
      return
    }

    setSubmitting(true)

    try {
      const now = new Date().toISOString()
      const newOrderItems: OrderItem[] = editableItems.map((item, index) => ({
        id: item.id || `ord-item-mod-${Date.now()}-${index}`,
        order_id: placedOrder.id,
        food_item_id: item.food_item_id,
        name_snapshot: item.name_snapshot,
        price_snapshot: item.price_snapshot,
        quantity: item.quantity,
      }))

      const updatedOrder: Order = {
        ...placedOrder,
        table_number: editableTable.trim(),
        total_amount: editableTotal,
        updated_at: now,
        order_items: newOrderItems,
      }

      if (IS_DEMO) {
        updateLocalOrder(placedOrder.id, updatedOrder)
      } else {
        // Update order in Supabase
        const { error: orderUpdateErr } = await supabase
          .from('orders')
          .update({
            table_number: editableTable.trim(),
            total_amount: editableTotal,
            updated_at: now,
          })
          .eq('id', placedOrder.id)

        if (orderUpdateErr) throw orderUpdateErr

        // Delete old order items & insert new snapshot items
        const { error: delErr } = await supabase
          .from('order_items')
          .delete()
          .eq('order_id', placedOrder.id)

        if (delErr) throw delErr

        const payload = newOrderItems.map(item => ({
          order_id: placedOrder.id,
          food_item_id: item.food_item_id || null,
          name_snapshot: item.name_snapshot,
          price_snapshot: item.price_snapshot,
          quantity: item.quantity,
        }))

        const { data: insertedItems, error: insErr } = await supabase
          .from('order_items')
          .insert(payload)
          .select()

        if (insErr) throw insErr

        updatedOrder.order_items = (insertedItems ?? []) as OrderItem[]
      }

      setPlacedOrder(updatedOrder)
      saveActiveCustomerOrder(updatedOrder)
      onOrderUpdated?.(updatedOrder)
      setIsEditing(false)
      toast.success('Order successfully updated! Kitchen notified.')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to update order. Please try again.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setIsEditing(false)
    onClose()
  }

  if (!open && !showTimerModal) return null

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-0 sm:px-4 font-sans text-slate-800">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={!submitting ? handleClose : undefined}
          />

          {/* Modal Box */}
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0 bg-gray-50/70">
              <div>
                <h2 className="font-extrabold text-gray-900 text-lg">
                  {isEditing
                    ? 'Edit Your Order'
                    : placedOrder
                    ? 'Order Confirmed'
                    : 'Confirm Order'}
                </h2>
                <p className="text-xs text-gray-500">
                  {isEditing
                    ? 'Adjust items or table number'
                    : placedOrder
                    ? 'Receipt & live status'
                    : 'Enter table number to place order'}
                </p>
              </div>
              {!submitting && (
                <button
                  onClick={handleClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </div>

        <div className="overflow-y-auto flex-1 p-6">
          {!placedOrder ? (
            /* 1. Initial Order Summary Form */
            <div className="space-y-5">
              {/* Table number input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                  Table Number / Room No. <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-600" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="e.g. Table 7 or Room 204"
                    value={tableNumber}
                    onChange={e => setTableNumber(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-gray-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
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
                    <div key={food_item.id} className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-2.5 min-w-0 pr-3">
                        <span className="w-5 h-5 bg-amber-100 text-amber-700 text-xs font-bold rounded flex items-center justify-center shrink-0">
                          {quantity}×
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {food_item.name}
                          </p>
                          <p className="text-xs text-gray-500">₹{food_item.price} each</p>
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
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-900/80 block">
                    Total Amount
                  </span>
                  <span className="text-xs text-gray-500">All taxes included</span>
                </div>
                <span className="font-black text-2xl text-amber-700">
                  ₹{totalAmount.toFixed(0)}
                </span>
              </div>
            </div>
          ) : isEditing ? (
            /* 2. Order Editing Mode (Within 2-min window) */
            <div className="space-y-4">
              {/* Live Countdown Banner */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-amber-800 font-semibold">
                  <Clock size={16} className="text-amber-600 animate-spin" style={{ animationDuration: '4s' }} />
                  <span>Time left to update:</span>
                </div>
                <span className="font-mono font-black text-sm text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded-lg">
                  {formatTimeLeft(remainingSeconds)}
                </span>
              </div>

              {/* Table input in edit mode */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Table / Room Number
                </label>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={editableTable}
                    onChange={e => setEditableTable(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="e.g. Table 4"
                  />
                </div>
              </div>

              {/* Editable items list */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Order Items
                </label>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50/40 overflow-hidden">
                  {editableItems.map((item, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 text-sm truncate">
                          {item.name_snapshot}
                        </p>
                        <p className="text-xs text-slate-400 font-medium">
                          ₹{item.price_snapshot} each
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                          <button
                            type="button"
                            onClick={() => handleUpdateEditableQty(idx, item.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 text-slate-700 transition-colors"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-slate-900">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateEditableQty(idx, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 text-slate-700 transition-colors"
                          >
                            <Plus size={13} />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleUpdateEditableQty(idx, 0)}
                          className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add dish dropdown while editing */}
              {menuItems.length > 0 && (
                <div className="bg-slate-100/70 p-3 rounded-xl border border-slate-200/80 space-y-2">
                  <span className="text-xs font-semibold text-slate-600 block">
                    Add another dish to this order:
                  </span>
                  <div className="flex gap-2">
                    <select
                      value={selectedAddDishId}
                      onChange={e => setSelectedAddDishId(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 outline-none"
                    >
                      <option value="">Select dish to add…</option>
                      {menuItems.map(dish => (
                        <option key={dish.id} value={dish.id}>
                          {dish.name} — ₹{dish.price}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddDishToOrder}
                      disabled={!selectedAddDishId}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Plus size={13} />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Revised Total */}
              <div className="flex items-center justify-between p-3.5 bg-amber-50 rounded-xl border border-amber-200/90">
                <span className="font-bold text-slate-800 text-sm">Updated Total</span>
                <span className="font-black text-xl text-amber-700">
                  ₹{editableTotal.toFixed(0)}
                </span>
              </div>
            </div>
          ) : (
            /* 3. Digital Receipt with 2-minute Edit Trigger */
            <div className="space-y-4">
              {/* Success Banner */}
              <div className="text-center pb-3 border-b border-dashed border-gray-200">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
                  <CheckCircle2 size={26} />
                </div>
                <h3 className="font-extrabold text-lg text-gray-900">Order Placed with Kitchen</h3>
                <p className="text-gray-500 text-xs">
                  Your meal is being prepared with fresh ingredients.
                </p>
              </div>

              {/* 2-Minute Edit & Cancel Window Banner */}
              <div
                className={`rounded-xl p-3 border transition-all ${
                  canEdit
                    ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                    : 'bg-slate-100/90 border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    {canEdit ? (
                      <Clock size={16} className="text-amber-600 shrink-0 animate-pulse" />
                    ) : (
                      <Lock size={15} className="text-slate-400 shrink-0" />
                    )}
                    <div>
                      <span className="font-bold text-xs block">
                        {canEdit
                          ? 'Need to change or cancel order?'
                          : 'Edit & cancel window closed (2 mins passed)'}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {canEdit
                          ? `You can modify items or cancel for another ${formatTimeLeft(remainingSeconds)}`
                          : 'Order locked in kitchen for preparation'}
                      </span>
                    </div>
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        onClick={startEditing}
                        className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1 shadow-sm shrink-0"
                      >
                        <Edit3 size={13} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={handleCancelOrder}
                        disabled={isCancelling}
                        className="px-2.5 py-1.5 bg-red-100 hover:bg-red-200 active:scale-95 text-red-700 font-bold text-xs rounded-lg transition-all flex items-center gap-1 border border-red-200 shrink-0"
                      >
                        <XCircle size={13} />
                        <span>Cancel</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Receipt metadata grid */}
              <div className="grid grid-cols-2 gap-2 text-left">
                <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                  <div className="flex items-center gap-1 text-gray-400 text-[11px] mb-0.5">
                    <Hash size={11} />
                    <span>Order No.</span>
                  </div>
                  <p className="font-bold text-gray-900 text-xs tracking-wide">
                    {placedOrder.order_number}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                  <div className="flex items-center gap-1 text-gray-400 text-[11px] mb-0.5">
                    <MapPin size={11} />
                    <span>Table</span>
                  </div>
                  <p className="font-bold text-gray-900 text-xs">
                    {placedOrder.table_number}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                  <div className="flex items-center gap-1 text-gray-400 text-[11px] mb-0.5">
                    <Clock size={11} />
                    <span>Order Time</span>
                  </div>
                  <p className="font-bold text-gray-900 text-xs">
                    {new Date(placedOrder.created_at).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                  <div className="flex items-center gap-1 text-gray-400 text-[11px] mb-0.5">
                    <Receipt size={11} />
                    <span>Status</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Kitchen Received
                  </span>
                </div>
              </div>

              {/* Item snapshot list */}
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-gray-100/70 px-4 py-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  <span>Ordered Items</span>
                  <span>Amount</span>
                </div>
                <div className="divide-y divide-gray-100 bg-white">
                  {placedOrder.order_items.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-4 py-2.5 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">{item.name_snapshot}</p>
                        <p className="text-[11px] text-gray-500">
                          ₹{item.price_snapshot} × {item.quantity}
                        </p>
                      </div>
                      <span className="font-bold text-gray-900">
                        ₹{(item.price_snapshot * item.quantity).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2.5 bg-amber-50 flex items-center justify-between border-t border-amber-100">
                  <span className="font-bold text-gray-900 text-xs">Total in Rupees</span>
                  <span className="font-black text-lg text-amber-700">
                    ₹{placedOrder.total_amount.toFixed(0)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1 text-gray-400 text-[11px]">
                <ShieldCheck size={13} className="text-emerald-500" />
                <span>Verified Hotel Dining Receipt</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 shrink-0 bg-white">
          {!placedOrder ? (
            <button
              onClick={handleSubmit}
              disabled={submitting || items.length === 0 || !tableNumber.trim()}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-slate-950 font-extrabold text-sm rounded-xl transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  <span>Submitting to Kitchen…</span>
                </>
              ) : (
                <span>Place Order • ₹{totalAmount.toFixed(0)}</span>
              )}
            </button>
          ) : isEditing ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={submitting}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={submitting || editableItems.length === 0 || remainingSeconds <= 0}
                className="flex-2 py-3 bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? (
                  <span>Updating…</span>
                ) : (
                  <>
                    <RotateCcw size={14} />
                    <span>Save Changes • ₹{editableTotal.toFixed(0)}</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={handleClose}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all"
            >
              Done & Return to Menu
            </button>
          )}
        </div>
      </div>
    </div>
      )}

      {/* Pop-up 2-Minute Timer & Cancel Modal right after ordering */}
      <EditTimerModal
        open={showTimerModal}
        order={placedOrder}
        remainingSeconds={remainingSeconds}
        onClose={() => setShowTimerModal(false)}
        onEdit={() => {
          setShowTimerModal(false)
          startEditing()
        }}
        onCancel={handleCancelOrder}
        isCancelling={isCancelling}
      />
    </>
  )
}
