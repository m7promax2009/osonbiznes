import React, { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

// Kontekstsiz global toast: istalgan joydan `toast.success('...')` chaqirish mumkin.
let listeners = []
let counter = 0

export function toast(message, type = 'info') {
  const item = { id: ++counter, message, type }
  listeners.forEach((l) => l(item))
  return item.id
}
toast.success = (m) => toast(m, 'success')
toast.error = (m) => toast(m, 'error')
toast.info = (m) => toast(m, 'info')

const STYLES = {
  success: { icon: CheckCircle2, cls: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200' },
  error: { icon: AlertCircle, cls: 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/70 text-rose-800 dark:text-rose-200' },
  info: { icon: Info, cls: 'border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/70 text-sky-800 dark:text-sky-200' },
}

// App ichida bir marta joylashtiriladi
export function Toaster() {
  const [items, setItems] = useState([])

  useEffect(() => {
    const listener = (item) => {
      setItems((prev) => [...prev, item])
      setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== item.id))
      }, 4000)
    }
    listeners.push(listener)
    return () => {
      listeners = listeners.filter((l) => l !== listener)
    }
  }, [])

  const dismiss = (id) => setItems((prev) => prev.filter((x) => x.id !== id))

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
      {items.map((item) => {
        const { icon: Icon, cls } = STYLES[item.type] || STYLES.info
        return (
          <div
            key={item.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-2.5 p-3.5 rounded-xl border shadow-lg text-xs font-semibold animate-slide-in ${cls}`}
          >
            <Icon className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1 leading-relaxed">{item.message}</span>
            <button onClick={() => dismiss(item.id)} className="opacity-60 hover:opacity-100 shrink-0" aria-label="Yopish">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default Toaster
