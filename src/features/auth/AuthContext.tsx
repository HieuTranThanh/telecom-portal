import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/types'

export const SESSION_KEY = 'admin_login_time'
export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000 // 24 giờ

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: Profile | null
  isAdmin: boolean
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const savedTime = localStorage.getItem(SESSION_KEY)
        if (savedTime && Date.now() - parseInt(savedTime) > SESSION_DURATION_MS) {
          // Session quá 24h — force logout
          supabase.auth.signOut().then(() => {
            localStorage.removeItem(SESSION_KEY)
            setSession(null)
            setIsLoading(false)
          })
          return
        }
        // Lần đầu load sau khi deploy tính năng này — bắt đầu đếm từ bây giờ
        if (!savedTime) localStorage.setItem(SESSION_KEY, Date.now().toString())
        setSession(session)
        loadProfile(session.user.id)
      } else {
        setIsLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      // Các event background không thay đổi user — chỉ cập nhật token, không reload profile
      if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') return
      if (session?.user) {
        setIsLoading(true)
        loadProfile(session.user.id)
      } else {
        setProfile(null)
        setIsLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId: string) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      setProfile(data)
    } catch {
      setProfile(null)
    } finally {
      setIsLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) localStorage.setItem(SESSION_KEY, Date.now().toString())
    return { error: error as Error | null }
  }

  const signOut = async () => {
    localStorage.removeItem(SESSION_KEY)
    await supabase.auth.signOut()
    setProfile(null)
  }

  const isAdmin = !!(profile?.role === 'admin' && profile?.is_active)

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profile,
      isAdmin,
      isLoading,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
