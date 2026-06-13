import { useState, useCallback, useEffect, useRef } from 'react'

const STORAGE_SYNC_EVENT = '__local_storage_sync__'

export function useLocalStorage<T>(key: string, initialValue: T) {
  const initialRef = useRef(initialValue)

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialRef.current
    } catch {
      return initialRef.current
    }
  })

  // Sync state across all hook instances in the same tab
  useEffect(() => {
    const handler = (e: CustomEvent<{ key: string }>) => {
      if (e.detail.key !== key) return
      try {
        const item = window.localStorage.getItem(key)
        setStoredValue(item ? JSON.parse(item) : initialRef.current)
      } catch {
        // ignore
      }
    }
    window.addEventListener(STORAGE_SYNC_EVENT, handler as EventListener)
    return () => window.removeEventListener(STORAGE_SYNC_EVENT, handler as EventListener)
  }, [key])

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      setStoredValue(prev => {
        const valueToStore = value instanceof Function ? value(prev) : value
        try {
          window.localStorage.setItem(key, JSON.stringify(valueToStore))
          window.dispatchEvent(new CustomEvent(STORAGE_SYNC_EVENT, { detail: { key } }))
        } catch {
          // ignore storage errors (private browsing, quota exceeded)
        }
        return valueToStore
      })
    },
    [key]
  )

  return [storedValue, setValue] as const
}
