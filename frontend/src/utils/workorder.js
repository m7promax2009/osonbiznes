// Ish buyurtmasi statuslari — label, rang, tartib
export const WO_STATUS = {
  new: { label: 'Qabul qilindi', short: 'Qabul', color: 'amber', dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800', col: 'border-amber-400' },
  in_progress: { label: 'Ishlanmoqda', short: 'Ishlanmoqda', color: 'blue', dot: 'bg-blue-500', pill: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800', col: 'border-blue-400' },
  ready: { label: 'Tayyor', short: 'Tayyor', color: 'emerald', dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800', col: 'border-emerald-400' },
  delivered: { label: 'Topshirildi', short: 'Topshirildi', color: 'slate', dot: 'bg-slate-400', pill: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700', col: 'border-slate-300' },
  cancelled: { label: 'Bekor qilindi', short: 'Bekor', color: 'rose', dot: 'bg-rose-500', pill: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800', col: 'border-rose-400' },
}

export const KANBAN_ORDER = ['new', 'in_progress', 'ready', 'delivered']

export function statusMeta(s) {
  return WO_STATUS[s] || WO_STATUS.new
}

export function formatSom(n) {
  return new Intl.NumberFormat('uz-UZ').format(Math.round(n || 0)) + " so'm"
}

// "taxminan 2 soat" / "kechikdi" ko'rinishida qolgan vaqt
export function readyIn(estimatedReady) {
  if (!estimatedReady) return null
  const diff = new Date(estimatedReady).getTime() - Date.now()
  const mins = Math.round(diff / 60000)
  if (mins <= -1) return { late: true, text: `${Math.abs(mins) >= 60 ? Math.round(Math.abs(mins) / 60) + ' soat' : Math.abs(mins) + ' daq'} kechikdi` }
  if (mins < 60) return { late: false, text: `~${Math.max(mins, 1)} daqiqa` }
  return { late: false, text: `~${Math.round(mins / 60)} soat` }
}

// Keyingi mantiqiy status (usta bitta tugma bilan oldinga suradi)
export function nextStatus(s) {
  if (s === 'new') return 'in_progress'
  if (s === 'in_progress') return 'ready'
  if (s === 'ready') return 'delivered'
  return null
}
