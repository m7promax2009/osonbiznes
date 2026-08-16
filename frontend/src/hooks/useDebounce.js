import { useState, useEffect } from 'react'

// Qiymatni "debounce" qiladi: tez o'zgarishlarda (har harf bosilganda) emas,
// faqat foydalanuvchi to'xtaganidan `delay` ms keyin yangilanadi.
// Bu har bosishda API so'rov yuborilishi va race-condition'ning oldini oladi.
export function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}
