export const BK_STATUS = {
  booked: { label: 'Navbatda', pill: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800', dot: 'bg-amber-500' },
  arrived: { label: 'Keldi', pill: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800', dot: 'bg-blue-500' },
  done: { label: 'Bajarildi', pill: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800', dot: 'bg-emerald-500' },
  no_show: { label: 'Kelmadi', pill: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800', dot: 'bg-rose-500' },
  cancelled: { label: 'Bekor qilindi', pill: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700', dot: 'bg-slate-400' },
}

export function bkMeta(s) { return BK_STATUS[s] || BK_STATUS.booked }
export function formatSom(n) { return new Intl.NumberFormat('uz-UZ').format(Math.round(n || 0)) + " so'm" }
export function todayStr() { return new Date().toISOString().slice(0, 10) }

// Keyingi N kun (band qilish uchun)
export function nextDays(n = 3) {
  const out = []
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.now() + i * 86400000)
    const str = d.toISOString().slice(0, 10)
    const label = i === 0 ? 'Bugun' : i === 1 ? 'Ertaga' : d.toLocaleDateString('uz-UZ', { weekday: 'short', day: 'numeric', month: 'short' })
    out.push({ str, label })
  }
  return out
}
