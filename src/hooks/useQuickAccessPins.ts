import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { STORAGE_KEYS } from '@/constants'

export function useQuickAccessPins() {
  const [pins, setPins] = useLocalStorage<string[]>(STORAGE_KEYS.QUICK_ACCESS_PINS, [])

  const togglePin = useCallback((linkId: string) => {
    setPins(prev =>
      prev.includes(linkId) ? prev.filter(id => id !== linkId) : [...prev, linkId]
    )
  }, [setPins])

  const isPinned = useCallback((linkId: string) => pins.includes(linkId), [pins])

  return { pins, togglePin, isPinned }
}
