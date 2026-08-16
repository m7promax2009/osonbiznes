// Foydalanuvchi kiritgan matnni MongoDB $regex ichida xavfsiz ishlatish uchun.
// Escape qilinmasa: `.*` hamma narsani topadi, `(a+)+$` esa ReDoS (event-loop qotishi) keltiradi.
function escapeRegex(str = '') {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Qidiruv uchun xavfsiz "ichida bor" filtri
function safeSearchRegex(str) {
  return { $regex: escapeRegex(str), $options: 'i' }
}

// Buyurtma/hisob-faktura itemlarini tekshirish va tozalash.
// qty butun va >=1, price >=0 bo'lishi shart. Yaroqsiz bo'lsa xato qaytaradi.
function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: 'Mahsulotlar majburiy' }
  }
  const clean = []
  for (const item of items) {
    const qty = Number(item.qty)
    const price = Number(item.price)
    if (!item.name || typeof item.name !== 'string') {
      return { error: 'Mahsulot nomi notogri' }
    }
    if (!Number.isFinite(qty) || qty < 1 || !Number.isInteger(qty)) {
      return { error: `"${item.name}" uchun miqdor butun va 1 dan katta bolishi kerak` }
    }
    if (!Number.isFinite(price) || price < 0) {
      return { error: `"${item.name}" uchun narx notogri` }
    }
    clean.push({
      name: item.name.trim(),
      qty,
      price,
      ...(item.category ? { category: String(item.category) } : {}),
      ...(item.productId ? { productId: item.productId } : {}),
    })
  }
  return { items: clean }
}

module.exports = { escapeRegex, safeSearchRegex, validateItems }
