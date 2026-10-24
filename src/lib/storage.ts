import type { FoodItem, Order, OrderStatus } from '../types'
import { DEMO_ITEMS } from './demoData'

const MENU_STORAGE_KEY = 'hotel_menu_items'
const ORDERS_STORAGE_KEY = 'hotel_menu_orders'
const ACTIVE_ORDER_STORAGE_KEY = 'hotel_active_customer_order'

// Initial seed orders for a realistic admin experience
const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-init-1',
    order_number: 'ORD-7K2A',
    table_number: 'Table 4',
    status: 'preparing',
    total_amount: 620,
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    order_items: [
      {
        id: 'item-1',
        order_id: 'ord-init-1',
        food_item_id: 'd1',
        name_snapshot: 'Butter Chicken',
        price_snapshot: 280,
        quantity: 1,
      },
      {
        id: 'item-2',
        order_id: 'ord-init-1',
        food_item_id: 'd4',
        name_snapshot: 'Garlic Naan',
        price_snapshot: 60,
        quantity: 2,
      },
      {
        id: 'item-3',
        order_id: 'ord-init-1',
        food_item_id: 'd7',
        name_snapshot: 'Chicken Biryani',
        price_snapshot: 320,
        quantity: 1,
      },
    ],
  },
  {
    id: 'ord-init-2',
    order_number: 'ORD-9M4B',
    table_number: 'Table 12',
    status: 'new',
    total_amount: 320,
    created_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    order_items: [
      {
        id: 'item-4',
        order_id: 'ord-init-2',
        food_item_id: 'd2',
        name_snapshot: 'Paneer Tikka Masala',
        price_snapshot: 240,
        quantity: 1,
      },
      {
        id: 'item-5',
        order_id: 'ord-init-2',
        food_item_id: 'd11',
        name_snapshot: 'Mango Lassi',
        price_snapshot: 80,
        quantity: 1,
      },
    ],
  },
]

export function getLocalMenuItems(): FoodItem[] {
  try {
    const raw = localStorage.getItem(MENU_STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(DEMO_ITEMS))
      return DEMO_ITEMS
    }
    return JSON.parse(raw) as FoodItem[]
  } catch {
    return DEMO_ITEMS
  }
}

export function saveLocalMenuItems(items: FoodItem[]): void {
  localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(items))
  window.dispatchEvent(new CustomEvent('hotel_menu_updated', { detail: items }))
}

export function getLocalOrders(): Order[] {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(INITIAL_ORDERS))
      return INITIAL_ORDERS
    }
    return JSON.parse(raw) as Order[]
  } catch {
    return INITIAL_ORDERS
  }
}

export function saveLocalOrders(orders: Order[]): void {
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders))
  window.dispatchEvent(new CustomEvent('hotel_orders_updated', { detail: orders }))
}

export function addLocalOrder(newOrder: Order): void {
  const current = getLocalOrders()
  const updated = [newOrder, ...current]
  saveLocalOrders(updated)
}

export function updateLocalOrder(orderId: string, updatedOrder: Order): void {
  const current = getLocalOrders()
  const updated = current.map(o => (o.id === orderId ? updatedOrder : o))
  saveLocalOrders(updated)
}

export function updateLocalOrderStatus(orderId: string, status: OrderStatus): void {
  const current = getLocalOrders()
  const updated = current.map(o =>
    o.id === orderId ? { ...o, status, updated_at: new Date().toISOString() } : o
  )
  saveLocalOrders(updated)
}

export function getActiveCustomerOrder(): Order | null {
  try {
    const raw = localStorage.getItem(ACTIVE_ORDER_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Order
  } catch {
    return null
  }
}

export function saveActiveCustomerOrder(order: Order | null): void {
  if (!order) {
    localStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY)
  } else {
    localStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, JSON.stringify(order))
  }
  window.dispatchEvent(new CustomEvent('hotel_active_order_changed', { detail: order }))
}
