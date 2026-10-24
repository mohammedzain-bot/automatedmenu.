import { useEffect, useState, useCallback } from 'react'
import { supabase, IS_DEMO } from '../lib/supabase'
import { getLocalMenuItems, saveLocalMenuItems } from '../lib/storage'
import type { FoodItem } from '../types'

type UpdatePayload = {
  is_available: boolean
  unavailable_until: string | null
  updated_at: string
}

export function useAdminMenu() {
  const [items, setItems] = useState<FoodItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    if (IS_DEMO) {
      try {
        const local = getLocalMenuItems()
        setItems(local)
        setError(null)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load menu')
      } finally {
        setLoading(false)
      }
      return
    }

    try {
      const { data, error } = await supabase
        .from('food_items')
        .select('*')
        .order('created_at', { ascending: false })

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

    if (IS_DEMO) {
      const handleStorageUpdate = () => fetchItems()
      window.addEventListener('hotel_menu_updated', handleStorageUpdate)
      window.addEventListener('storage', handleStorageUpdate)
      return () => {
        window.removeEventListener('hotel_menu_updated', handleStorageUpdate)
        window.removeEventListener('storage', handleStorageUpdate)
      }
    }
  }, [fetchItems])

  const deleteItem = useCallback(async (id: string) => {
    if (IS_DEMO) {
      const current = getLocalMenuItems()
      const updated = current.filter(i => i.id !== id)
      saveLocalMenuItems(updated)
      setItems(updated)
      return
    }

    const { error } = await supabase.from('food_items').delete().eq('id', id)
    if (error) throw error
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const toggleAvailability = useCallback(async (id: string, currentlyAvailable: boolean) => {
    // Tomorrow's date in Asia/Kolkata timezone
    const tomorrow = new Date(Date.now() + 86400000)
    const tomorrowStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(tomorrow)

    const now = new Date().toISOString()
    const updateData: UpdatePayload = currentlyAvailable
      ? { is_available: false, unavailable_until: tomorrowStr, updated_at: now }
      : { is_available: true, unavailable_until: null, updated_at: now }

    if (IS_DEMO) {
      const current = getLocalMenuItems()
      const updated = current.map(i =>
        i.id === id ? { ...i, ...updateData } : i
      )
      saveLocalMenuItems(updated)
      setItems(updated)
      return
    }

    const { error } = await supabase
      .from('food_items')
      .update(updateData)
      .eq('id', id)

    if (error) throw error
    setItems(prev =>
      prev.map(i =>
        i.id === id
          ? { ...i, ...updateData }
          : i
      )
    )
  }, [])

  const saveItem = useCallback(async (item: Partial<FoodItem> & { id?: string }) => {
    const now = new Date().toISOString()

    if (IS_DEMO) {
      const current = getLocalMenuItems()
      if (item.id) {
        const updated = current.map(i =>
          i.id === item.id ? ({ ...i, ...item, updated_at: now } as FoodItem) : i
        )
        saveLocalMenuItems(updated)
        setItems(updated)
        return updated.find(i => i.id === item.id) as FoodItem
      } else {
        const newItem: FoodItem = {
          id: `item-${Date.now().toString(36)}`,
          name: item.name ?? '',
          description: item.description ?? null,
          price: Number(item.price) || 0,
          category: item.category ?? 'Main Course',
          image_url: null,
          cloudinary_public_id: null,
          is_available: true,
          unavailable_until: null,
          created_at: now,
          updated_at: now,
        }
        const updated = [newItem, ...current]
        saveLocalMenuItems(updated)
        setItems(updated)
        return newItem
      }
    }

    if (item.id) {
      const { id, ...rest } = item
      const { data, error } = await supabase
        .from('food_items')
        .update({ ...rest, updated_at: now })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      const updated = data as FoodItem
      setItems(prev => prev.map(i => (i.id === id ? updated : i)))
      return updated
    } else {
      const { data, error } = await supabase
        .from('food_items')
        .insert([{
          name: item.name ?? '',
          description: item.description ?? null,
          price: item.price ?? 0,
          category: item.category ?? null,
          image_url: item.image_url ?? null,
          cloudinary_public_id: item.cloudinary_public_id ?? null,
          is_available: item.is_available ?? true,
          unavailable_until: item.unavailable_until ?? null,
          created_at: now,
          updated_at: now,
        }])
        .select()
        .single()

      if (error) throw error
      const created = data as FoodItem
      setItems(prev => [created, ...prev])
      return created
    }
  }, [])

  return { items, loading, error, deleteItem, toggleAvailability, saveItem, refetch: fetchItems }
}
