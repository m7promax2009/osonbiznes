// Har bir tarif uchun resurs cheklovlari.
// business = cheksiz. Bu qiymatlarni biznes rejasiga qarab bemalol o'zgartiring.
// Eslatma: modelda "bepul" (free) tarif yo'q — 14 kunlik trial uning o'rnida.
const PLAN_LIMITS = {
  trial: { products: 200, customers: 500 }, // 14 kunlik to'liq sinov
  start: { products: 50, customers: 100 },
  pro: { products: 200, customers: 500 },
  business: { products: Infinity, customers: Infinity },
  blocked: { products: 0, customers: 0 },
}

function getLimit(tariff, resource) {
  const plan = PLAN_LIMITS[tariff] || PLAN_LIMITS.trial
  const val = plan[resource]
  return val === undefined ? Infinity : val
}

module.exports = { PLAN_LIMITS, getLimit }
