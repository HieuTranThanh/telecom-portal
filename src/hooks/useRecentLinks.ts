import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { STORAGE_KEYS, MAX_RECENT_ITEMS } from '@/constants'

export function useRecentLinks() {
  const [recent, setRecent] = useLocalStorage<string[]>(STORAGE_KEYS.RECENT, [])

  const addRecent = useCallback((linkId: string) => {
    setRecent(prev => {
      const filtered = prev.filter(id => id !== linkId)
      return [linkId, ...filtered].slice(0, MAX_RECENT_ITEMS)
    })
  }, [setRecent])

  const clearRecent = useCallback(() => setRecent([]), [setRecent])

  const removeRecent = useCallback((id: string) => {
    setRecent(prev => prev.filter(i => i !== id))
  }, [setRecent])

  return { recent, addRecent, clearRecent, removeRecent }
}
