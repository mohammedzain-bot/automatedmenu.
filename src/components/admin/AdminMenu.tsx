import { useState } from 'react'
import { Plus, Pencil, Trash2, EyeOff, Eye, Loader2, X, Utensils, CheckCircle } from 'lucide-react'
import { useAdminMenu } from '../../hooks/useAdminMenu'
import type { FoodItem } from '../../types'
import toast from 'react-hot-toast'

const CATEGORIES = [
  'Starters',
  'Main Course',
  'Breads',
  'Rice & Biryani',
  'Desserts',
  'Beverages',
  'Snacks',
  'Soups',
]

export default function AdminMenu() {
  const { items, loading, deleteItem, toggleAvailability, saveItem } = useAdminMenu()
  const [editItem, setEditItem] = useState<Partial<FoodItem> | null>(null)
  const [isNew, setIsNew] = useState(false)

  const handleAdd = () => {
    setIsNew(true)
    setEditItem({
      name: '',
      price: 150,
      description: '',
      category: 'Main Course',
      is_available: true,
    })
  }

  const handleEdit = (item: FoodItem) => {
    setIsNew(false)
    setEditItem({ ...item })
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Permanently delete "${name}" from hotel menu? Past receipts will remain intact.`)) {
      return
    }
    try {
      await deleteItem(id)
      toast.success(`"${name}" permanently deleted`)
    } catch {
      toast.error('Failed to delete item')
    }
  }

  const handleToggle = async (item: FoodItem) => {
    try {
      await toggleAvailability(item.id, item.is_available)
      toast.success(
        item.is_available
          ? `"${item.name}" marked unavailable today (auto-resets tomorrow)`
          : `"${item.name}" restored to active menu`
      )
    } catch {
      toast.error('Failed to update availability')
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 animate-pulse space-y-2">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-3 bg-slate-100 rounded w-2/3" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-extrabold text-slate-900 text-lg">Hotel Food Menu</h2>
          <p className="text-xs text-slate-500">
            {items.length} items configured • Manage pricing, daily availability, and items
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-sm"
        >
          <Plus size={16} />
          <span>Add New Dish</span>
        </button>
      </div>

      {items.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8">
          <Utensils size={32} className="text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-slate-700 text-sm">No items in the menu</h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">Add your hotel dishes and prices in rupees.</p>
          <button
            onClick={handleAdd}
            className="btn-primary text-xs"
          >
            Add Your First Dish
          </button>
        </div>
      )}

      {/* Food items layout without images */}
      <div className="space-y-2.5">
        {items.map(item => (
          <div
            key={item.id}
            className={`bg-white rounded-xl p-4 border transition-all flex items-center justify-between gap-4 ${
              item.is_available
                ? 'border-slate-200/90 hover:border-slate-300 shadow-sm'
                : 'border-red-200/70 bg-red-50/20 opacity-75'
            }`}
          >
            {/* Left: Name, Description, Category */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-900 text-base">{item.name}</span>
                {item.category && (
                  <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {item.category}
                  </span>
                )}
                {!item.is_available ? (
                  <span className="text-[11px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded flex items-center gap-1">
                    <EyeOff size={11} /> Hidden Today
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle size={11} /> Active on Menu
                  </span>
                )}
              </div>

              {item.description && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                  {item.description}
                </p>
              )}
            </div>

            {/* Middle: Price in Rupees */}
            <div className="text-right shrink-0 px-2">
              <span className="text-xs text-slate-400 block font-medium">Price</span>
              <span className="font-black text-slate-900 text-base">
                ₹{item.price.toFixed(0)}
              </span>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Daily Availability Button */}
              <button
                onClick={() => handleToggle(item)}
                title={
                  item.is_available
                    ? 'Mark unavailable for the rest of today (auto-resets at midnight)'
                    : 'Restore item to active menu now'
                }
                className={`p-2 rounded-lg text-xs font-semibold transition-colors ${
                  item.is_available
                    ? 'text-amber-700 hover:bg-amber-50'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                {item.is_available ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>

              {/* Edit Button */}
              <button
                onClick={() => handleEdit(item)}
                title="Edit dish name, price or category"
                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Pencil size={17} />
              </button>

              {/* Permanent Delete Button */}
              <button
                onClick={() => handleDelete(item.id, item.name)}
                title="Permanently delete from menu"
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={17} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit/Add Modal */}
      {editItem !== null && (
        <FoodItemModal
          item={editItem}
          isNew={isNew}
          onSave={async data => {
            try {
              await saveItem(data)
              toast.success(isNew ? 'New dish added to menu' : 'Dish updated successfully')
              setEditItem(null)
            } catch (e: unknown) {
              toast.error(e instanceof Error ? e.message : 'Failed to save item')
            }
          }}
          onClose={() => setEditItem(null)}
        />
      )}
    </div>
  )
}

function FoodItemModal({
  item,
  isNew,
  onSave,
  onClose,
}: {
  item: Partial<FoodItem>
  isNew: boolean
  onSave: (data: Partial<FoodItem>) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState({ ...item })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    if (!form.name?.trim()) return toast.error('Please enter food item name')
    if (!form.price || form.price <= 0) return toast.error('Please enter valid price in Rupees')

    setSaving(true)
    try {
      await onSave(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <h2 className="font-extrabold text-slate-900 text-base">
            {isNew ? 'Add Food Dish' : 'Edit Dish Details'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Food Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name ?? ''}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Paneer Butter Masala"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Price in Rupees (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  value={form.price ?? ''}
                  onChange={e =>
                    setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="250"
                  min="1"
                  step="1"
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-bold text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Category
              </label>
              <select
                value={form.category ?? 'Main Course'}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium text-sm focus:ring-2 focus:ring-amber-500 outline-none bg-white"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Short Description / Ingredients
            </label>
            <textarea
              value={form.description ?? ''}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Fresh cottage cheese cooked in creamy tomato gravy with aromatic spices"
              rows={3}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 outline-none resize-none"
            />
          </div>

          {/* Availability Switch */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Available to Customers</span>
              <span className="text-[11px] text-slate-400">
                Turn off to hide from menu today
              </span>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, is_available: !f.is_available }))}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                form.is_available ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                  form.is_available ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving…</span>
                </>
              ) : isNew ? (
                'Add Dish'
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
