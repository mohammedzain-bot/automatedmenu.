export type OrderStatus = 'new' | 'preparing' | 'ready' | 'completed' | 'cancelled'

export interface FoodItem {
  id: string
  name: string
  description: string | null
  price: number
  category: string | null
  image_url: string | null
  cloudinary_public_id: string | null
  is_available: boolean
  unavailable_until: string | null // ISO date string (date only, not datetime)
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  order_number: string
  table_number: string
  status: OrderStatus
  total_amount: number
  created_at: string
  updated_at: string
  order_items: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  food_item_id: string | null
  name_snapshot: string
  price_snapshot: number
  quantity: number
}

export interface CartItem {
  food_item: FoodItem
  quantity: number
}

export interface NewOrderPayload {
  table_number: string
  items: {
    food_item_id: string
    quantity: number
  }[]
}
