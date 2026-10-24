export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      food_items: {
        Row: {
          id: string
          name: string
          description: string | null
          price: number
          category: string | null
          image_url: string | null
          cloudinary_public_id: string | null
          is_available: boolean
          unavailable_until: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price: number
          category?: string | null
          image_url?: string | null
          cloudinary_public_id?: string | null
          is_available?: boolean
          unavailable_until?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price?: number
          category?: string | null
          image_url?: string | null
          cloudinary_public_id?: string | null
          is_available?: boolean
          unavailable_until?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          order_number: string
          table_number: string
          status: string
          total_amount: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number?: string
          table_number: string
          status?: string
          total_amount: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_number?: string
          table_number?: string
          status?: string
          total_amount?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          food_item_id: string | null
          name_snapshot: string
          price_snapshot: number
          quantity: number
        }
        Insert: {
          id?: string
          order_id: string
          food_item_id?: string | null
          name_snapshot: string
          price_snapshot: number
          quantity: number
        }
        Update: {
          id?: string
          order_id?: string
          food_item_id?: string | null
          name_snapshot?: string
          price_snapshot?: number
          quantity?: number
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
