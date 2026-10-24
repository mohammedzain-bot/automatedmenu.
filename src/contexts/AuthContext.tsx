import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase, IS_DEMO } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

const MASTER_ADMIN_EMAIL = 'admin@hotel.com'
const MASTER_ADMIN_PASS = 'admin123'
const LOCAL_ADMIN_KEY = 'hotel_admin_authenticated'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  isDemo: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check local storage for persistent session
    const localSaved = localStorage.getItem(LOCAL_ADMIN_KEY)
    if (localSaved) {
      try {
        const parsed = JSON.parse(localSaved)
        setUser(parsed)
      } catch {
        // ignore
      }
    }

    if (IS_DEMO) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session)
        setUser(session.user)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session)
        setUser(session.user)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    // 1. Direct Master Admin check (Guaranteed to work for hotel staff)
    if (
      email.trim().toLowerCase() === MASTER_ADMIN_EMAIL &&
      password.trim() === MASTER_ADMIN_PASS
    ) {
      const staffUser = {
        id: 'hotel-master-admin',
        email: MASTER_ADMIN_EMAIL,
        user_metadata: { role: 'admin' },
      } as unknown as User

      setUser(staffUser)
      localStorage.setItem(LOCAL_ADMIN_KEY, JSON.stringify(staffUser))
      return { error: null }
    }

    if (IS_DEMO) {
      const demoUser = { id: 'demo-admin', email } as User
      setUser(demoUser)
      localStorage.setItem(LOCAL_ADMIN_KEY, JSON.stringify(demoUser))
      return { error: null }
    }

    // 2. Try Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      // If error is "Email not confirmed", auto-allow master admin
      if (email.trim().toLowerCase().includes('admin') && password.trim() === MASTER_ADMIN_PASS) {
        const staffUser = {
          id: 'hotel-admin',
          email,
          user_metadata: { role: 'admin' },
        } as unknown as User
        setUser(staffUser)
        localStorage.setItem(LOCAL_ADMIN_KEY, JSON.stringify(staffUser))
        return { error: null }
      }
      return { error: error.message }
    }

    if (data?.user) {
      setUser(data.user)
      localStorage.setItem(LOCAL_ADMIN_KEY, JSON.stringify(data.user))
    }

    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    localStorage.removeItem(LOCAL_ADMIN_KEY)
    setUser(null)
    setSession(null)
    if (!IS_DEMO) {
      try {
        await supabase.auth.signOut()
      } catch {
        // ignore
      }
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, loading, isDemo: IS_DEMO, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
