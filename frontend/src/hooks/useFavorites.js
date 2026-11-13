import { useCallback, useEffect, useState } from 'react'

// Saralangan mahsulotlar (OLX/Uzum'dagi yurakcha). Faqat shu brauzerda, kirishsiz ishlaydi.
const KEY = 'ob_favorites'
const EVT = 'ob-favorites'

const read = () => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export function useFavorites() {
  const [items, setItems] = useState(read)

  useEffect(() => {
    const sync = () => setItems(read())
    window.addEventListener(EVT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const toggle = useCallback((p) => {
    const cur = read()
    const next = cur.some((i) => i._id === p._id)
      ? cur.filter((i) => i._id !== p._id)
      : [{ _id: p._id, name: p.name, price: p.price, images: p.images, category: p.category, stock: p.stock, shopId: p.shopId, shopName: p.shopName, shopCity: p.shopCity }, ...cur].slice(0, 200)
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      /* storage bloklangan */
    }
    window.dispatchEvent(new Event(EVT))
  }, [])

  const has = useCallback((id) => items.some((i) => i._id === id), [items])
  return { favorites: items, count: items.length, toggle, has }
}
