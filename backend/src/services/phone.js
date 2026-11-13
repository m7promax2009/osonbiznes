// O'zbekiston raqami: 9 ta raqam (90 123 45 67) yoki 998 bilan 12 ta. Natija: +998XXXXXXXXX yoki null
function normalizePhone(raw) {
  const d = String(raw || '').replace(/\D/g, '')
  if (d.length === 9) return `+998${d}`
  if (d.length === 12 && d.startsWith('998')) return `+${d}`
  return null
}

module.exports = { normalizePhone }
