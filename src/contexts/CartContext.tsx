import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { FoodItem, CartItem } from '../types'

interface CartContextValue {
  items: CartItem[]
  addItem: (food: FoodItem) => void
  removeItem: (foodId: string) => void
  updateQuantity: (foodId: string, qty: number) => void
  clearCart: () => void
  totalItems: number
  totalAmount: number
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  const addItem = useCallback((food: FoodItem) => {
    setItems(prev => {
      const existing = prev.find(i => i.food_item.id === food.id)
      if (existing) {
        return prev.map(i =>
          i.food_item.id === food.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { food_item: food, quantity: 1 }]
    })
  }, [])

  const removeItem = useCallback((foodId: string) => {
    setItems(prev => prev.filter(i => i.food_item.id !== foodId))
  }, [])

  const updateQuantity = useCallback((foodId: string, qty: number) => {
    if (qty <= 0) {
      setItems(prev => prev.filter(i => i.food_item.id !== foodId))
    } else {
      setItems(prev =>
        prev.map(i => (i.food_item.id === foodId ? { ...i, quantity: qty } : i))
      )
    }
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
  const totalAmount = items.reduce((sum, i) => sum + i.food_item.price * i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalAmount }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
