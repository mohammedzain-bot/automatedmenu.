import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase, IS_DEMO } from '../lib/supabase'
import { getLocalOrders, updateLocalOrderStatus } from '../lib/storage'
import type { Order, OrderStatus } from '../types'

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchOrders = useCallback(async () => {
    if (IS_DEMO) {
      try {
        const local = getLocalOrders()
        setOrders(local)
        setError(null)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load orders')
      } finally {
        setLoading(false)
      }
      return
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw error
      setOrders(data as Order[])
      setError(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()

    if (IS_DEMO) {
      const handleOrdersChanged = () => {
        fetchOrders()
      }
      window.addEventListener('hotel_orders_updated', handleOrdersChanged)
      window.addEventListener('storage', handleOrdersChanged)
      return () => {
        window.removeEventListener('hotel_orders_updated', handleOrdersChanged)
        window.removeEventListener('storage', handleOrdersChanged)
      }
    }

    channelRef.current = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        () => fetchOrders()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          setOrders(prev =>
            prev.map(o =>
              o.id === (payload.new as { id: string }).id
                ? { ...o, ...(payload.new as Partial<Order>) }
                : o
            )
          )
        }
      )
      .subscribe()

    return () => {
      channelRef.current?.unsubscribe()
    }
  }, [fetchOrders])

  const updateStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    if (IS_DEMO) {
      updateLocalOrderStatus(orderId, status)
      setOrders(prev =>
        prev.map(o => (o.id === orderId ? { ...o, status, updated_at: new Date().toISOString() } : o))
      )
      return
    }

    const { error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)

    if (error) throw error
    setOrders(prev =>
      prev.map(o => (o.id === orderId ? { ...o, status } : o))
    )
  }, [])

  return { orders, loading, error, updateStatus, refetch: fetchOrders }
}
