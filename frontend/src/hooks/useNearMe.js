import { useCallback, useState } from 'react'

// Xaridorning taxminiy joylashuvi — faqat yaqin do'konlarni saralash uchun, serverda saqlanmaydi
const KEY = 'ob_near'

const read = () => {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) || 'null')
    return v && Number.isFinite(v.lat) && Number.isFinite(v.lng) ? v : null
  } catch {
    return null
  }
}

export function useNearMe() {
  const [near, setNear] = useState(read)
  const [status, setStatus] = useState('idle') // idle | loading | denied

  const locate = useCallback(
    () =>
      new Promise((resolve) => {
        if (!navigator.geolocation) {
          setStatus('denied')
          return resolve(null)
        }
        setStatus('loading')
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const v = { lat: Math.round(pos.coords.latitude * 1e4) / 1e4, lng: Math.round(pos.coords.longitude * 1e4) / 1e4 }
            try {
              sessionStorage.setItem(KEY, JSON.stringify(v))
            } catch {
              /* ignore */
            }
            setNear(v)
            setStatus('idle')
            resolve(v)
          },
          () => {
            setStatus('denied')
            resolve(null)
          },
          { timeout: 10000, maximumAge: 600000 }
        )
      }),
    []
  )

  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(KEY)
    } catch {
      /* ignore */
    }
    setNear(null)
  }, [])

  return { near, status, locate, clear, nearParam: near ? `${near.lat},${near.lng}` : '' }
}
