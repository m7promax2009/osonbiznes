import { useCallback, useEffect, useState } from 'react'
import sounds from '../utils/audio'
import { toast } from '../components/Toast'

// OsonBozor savati — barcha sahifalar (bozor, do'kon, mahsulot) bitta localStorage kalitini ishlatadi
const KEY = 'osonbozor_cart'
const EVT = 'osonbozor-cart'

const read = () => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

const write = (cart) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(cart))
  } catch {
    /* storage bloklangan */
  }
  window.dispatchEvent(new Event(EVT))
}

const idOf = (i) => i.productId || i._id

export function useCart() {
  const [cart, setCart] = useState(read)

  useEffect(() => {
    const sync = () => setCart(read())
    window.addEventListener(EVT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const update = useCallback((fn) => write(fn(read())), [])

  const addToCart = useCallback(
    (product, shop, qty = 1) => {
      sounds.playCashChing()
      update((prev) => {
        const max = product.stock ?? Infinity
        const existing = prev.find((i) => idOf(i) === product._id)
        if (existing) {
          return prev.map((i) => (idOf(i) === product._id ? { ...i, qty: Math.min(max, i.qty + qty) } : i))
        }
        return [
          ...prev,
          {
            productId: product._id,
            _id: product._id,
            name: product.name,
            price: product.price,
            stock: product.stock,
            images: product.images,
            category: product.category,
            shopId: shop?._id || product.shopId,
            shopName: shop?.name || product.shopName,
            qty: Math.min(max, qty),
          },
        ]
      })
      toast.success(`"${product.name}" savatga qo'shildi`)
    },
    [update]
  )

  const updateCartQty = useCallback(
    (productId, delta) => {
      sounds.playClick()
      update((prev) =>
        prev
          .map((i) => {
            if (idOf(i) !== productId) return i
            const q = i.qty + delta
            return q > 0 ? { ...i, qty: q } : null
          })
          .filter(Boolean)
      )
    },
    [update]
  )

  const removeFromCart = useCallback(
    (productId) => {
      sounds.playClick()
      update((prev) => prev.filter((i) => idOf(i) !== productId))
      toast.info("Mahsulot savatdan o'chirildi")
    },
    [update]
  )

  const clearCart = useCallback(() => write([]), [])

  const count = cart.reduce((s, i) => s + i.qty, 0)
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0)

  return { cart, count, total, addToCart, updateCartQty, removeFromCart, clearCart }
}
