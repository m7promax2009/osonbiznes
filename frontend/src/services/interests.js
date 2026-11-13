// Xaridor qiziqishlari — faqat brauzerda (localStorage). Serverga faqat "soat:3,smartfon:1" ko'rinishida yuboriladi.
const KEY = 'ob_interests'
const SEED_KEY = 'ob_feed_seed'
const MAX_TERMS = 30

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}')
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

export function recordInterest(term, weight = 1) {
  const t = String(term || '').trim().toLowerCase().slice(0, 40)
  if (t.length < 2) return
  try {
    const data = load()
    // Eski qiziqishlar asta-sekin so'nadi, yangilari ustun
    for (const k of Object.keys(data)) data[k] = data[k] * 0.9
    data[t] = (data[t] || 0) + weight
    const top = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, MAX_TERMS)
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(top)))
  } catch {
    /* storage bloklangan — shaxsiylashtirishsiz ishlaydi */
  }
}

export function interestsParam() {
  return Object.entries(load())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .filter(([, w]) => w >= 0.5)
    .map(([t, w]) => `${t.replace(/[,:]/g, ' ')}:${Math.min(10, Math.max(1, Math.round(w)))}`)
    .join(',')
}

export function hasInterests() {
  return interestsParam().length > 0
}

// Har yangi tashrifda (sessiyada) boshqa tartib, sahifalashda esa barqaror
export function feedSeed() {
  try {
    let s = sessionStorage.getItem(SEED_KEY)
    if (!s) {
      s = Math.random().toString(36).slice(2, 10)
      sessionStorage.setItem(SEED_KEY, s)
    }
    return s
  } catch {
    return ''
  }
}
