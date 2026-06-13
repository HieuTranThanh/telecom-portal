import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { STORAGE_KEYS } from '@/constants'

export function useFavorites() {
  const [favorites, setFavorites] = useLocalStorage<string[]>(STORAGE_KEYS.FAVORITES, [])

  const toggleFavorite = useCallback((linkId: string) => {
    setFavorites(prev =>
      prev.includes(linkId) ? prev.filter(id => id !== linkId) : [...prev, linkId]
    )
  }, [setFavorites])

  const isFavorite = useCallback((linkId: string) => favorites.includes(linkId), [favorites])

  return { favorites, toggleFavorite, isFavorite }
}
