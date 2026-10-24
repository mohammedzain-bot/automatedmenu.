import { useEffect, useState, useCallback } from 'react'
import { supabase, IS_DEMO } from '../lib/supabase'
import { getLocalMenuItems, saveLocalMenuItems } from '../lib/storage'
import type { FoodItem } from '../types'

// Check and reset items if new day has started in Asia/Kolkata
function resetExpiredUnavailable(items: FoodItem[]): { updated: boolean; items: FoodItem[] } {
  // Current date string in Asia/Kolkata timezone (YYYY-MM-DD)
  const kolkataDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

  let changed = false
  const updatedItems = items.map(item => {
    if (!item.is_available && item.unavailable_until && item.unavailable_until <= kolkataDateStr) {
      changed = true
      return {
        ...item,
        is_available: true,
        unavailable_until: null,
        updated_at: new Date().toISOString(),
      }
    }
    return item
  })

  return { updated: changed, items: updatedItems }
}

export function useMenuItems() {
  const [items, setItems] = useState<FoodItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    if (IS_DEMO) {
      try {
        const raw = getLocalMenuItems()
        const { updated, items: verified } = resetExpiredUnavailable(raw)
        if (updated) {
          saveLocalMenuItems(verified)
        }
        // Filter only available items for customer menu
        const available = verified.filter(i => i.is_available)
        setItems(available)
        setError(null)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load menu')
      } finally {
        setLoading(false)
      }
      return
    }

    try {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('food_items')
        .select('*')
        .eq('is_available', true)
        .or(`unavailable_until.is.null,unavailable_until.lt.${today}`)
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error
      setItems(data as FoodItem[])
      setError(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load menu')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems()

    // Listen for live updates from admin in demo mode
    const handleStorageUpdate = () => {
      fetchItems()
    }
    window.addEventListener('hotel_menu_updated', handleStorageUpdate)
    window.addEventListener('storage', handleStorageUpdate)

    return () => {
      window.removeEventListener('hotel_menu_updated', handleStorageUpdate)
      window.removeEventListener('storage', handleStorageUpdate)
    }
  }, [fetchItems])

  return { items, loading, error, refetch: fetchItems }
}
