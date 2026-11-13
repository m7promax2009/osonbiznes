const express = require('express')
const router = express.Router()
const Product = require('../models/Product')
const Order = require('../models/Order')
const Customer = require('../models/Customer')
const { authenticate } = require('../middleware/auth')

const GEMINI_MODELS = [
  ...new Set([process.env.GEMINI_MODEL, 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest'].filter(Boolean)),
]

async function askGemini({ message, history, context }) {
  const key = process.env.GEMINI_API_KEY
  if (!key || !message.trim()) return null
  const contents = history
    .slice(-10)
    .filter(m => m && typeof m.text === 'string' && (m.sender === 'user' || m.sender === 'ai'))
    .map(m => ({ role: m.sender === 'user' ? 'user' : 'model', parts: [{ text: m.text.slice(0, 1500) }] }))
  contents.push({ role: 'user', parts: [{ text: message }] })
  const system =
    "Sen OsonBiznes CRM ichidagi do'kon egasining biznes maslahatchisisan. Foydalanuvchi qaysi tilda yozsa, shu tilda, qisqa va samimiy javob ber. " +
    "Salomlashsa — oddiygina salomlash va qanday yordam kerakligini so'ra, statistika tashlama. " +
    "Raqamlarni faqat quyidagi do'kon ma'lumotlaridan ol, o'ylab topma. Mavzudan tashqari so'rovlarni muloyim rad et.\n" +
    'DOKON_MALUMOTLARI: ' + JSON.stringify(context)
  // "Fikrlash"ni o'chiramiz: maslahatchi uchun kerak emas, javobni ~3 barobar tezlashtiradi (6s -> 2s)
  const bodyFor = model =>
    JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.6,
        thinkingConfig: model.startsWith('gemini-3') ? { thinkingLevel: 'minimal' } : { thinkingBudget: 0 },
      },
    })
  // Google band bo'lsa (503/429/404) — keyingi modelga o'tamiz; umumiy kutish ~25 soniyadan oshmaydi
  const deadline = Date.now() + 25000
  for (const model of GEMINI_MODELS) {
    const left = deadline - Date.now()
    if (left < 2000) break
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), Math.min(9000, left))
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: bodyFor(model),
        signal: ctrl.signal,
      })
      clearTimeout(timer)
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        console.error(`Gemini ${model}: ${r.status} ${err?.error?.status || ''}`)
        continue
      }
      const j = await r.json()
      const text = j?.candidates?.[0]?.content?.parts?.map(p => (p.thought ? '' : p.text || '')).join('').trim()
      if (text) return text
    } catch (e) {
      console.error(`Gemini ${model} failed:`, e.name === 'AbortError' ? 'timeout' : e.message)
    }
  }
  return null
}

// POST /api/ai/advisor - Smart AI Business Consultant
router.post('/advisor', authenticate, async (req, res) => {
  try {
    const { message = '', contextType = 'general' } = req.body

    // Fetch store metrics in parallel
    const [products, orders, customers] = await Promise.all([
      Product.find({ userId: req.user.id, isActive: { $ne: false } }).lean(),
      Order.find({ userId: req.user.id, status: { $ne: 'cancelled' } }).sort({ createdAt: -1 }).limit(50).lean(),
      Customer.find({ userId: req.user.id, isActive: true }).lean(),
    ])

    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)
    const lowStockProducts = products.filter(p => p.stock <= 3)
    const outOfStockProducts = products.filter(p => p.stock === 0)
    const debtors = customers.filter(c => (c.debt || 0) > 0)
    const totalDebt = debtors.reduce((sum, c) => sum + (c.debt || 0), 0)

    // Calculate Top product
    const productSales = {}
    orders.forEach(o => {
      (o.items || []).forEach(i => {
        productSales[i.name] = (productSales[i.name] || 0) + (i.qty || 1)
      })
    })
    const sortedProducts = Object.entries(productSales).sort((a, b) => b[1] - a[1])
    const topSeller = sortedProducts[0] ? `${sortedProducts[0][0]} (${sortedProducts[0][1]} dona)` : 'Hali savdo yetarli emas'

    const lowerQuery = String(message).toLowerCase()
    let reply = ''
    let suggestions = []

    // Haqiqiy AI (Gemini): kalit bo'lsa — erkin suhbat, do'kon ma'lumotlari kontekst sifatida
    const llmReply = await askGemini({
      message: String(message).slice(0, 1000),
      history: Array.isArray(req.body.history) ? req.body.history : [],
      context: {
        mahsulotlar: products.length,
        tugaganlar: outOfStockProducts.slice(0, 10).map(p => p.name),
        kamQolgan: lowStockProducts.slice(0, 10).map(p => `${p.name} (${p.stock})`),
        buyurtmalarOxirgi50: orders.length,
        tushum: totalRevenue,
        engKopSotilgan: topSeller,
        mijozlar: customers.length,
        qarzdorlar: debtors.slice(0, 10).map(d => `${d.name}: ${d.debt}`),
        jamiNasiya: totalDebt,
      },
    })
    if (llmReply) {
      return res.json({ success: true, data: { reply: llmReply, suggestions: [], metrics: { totalRevenue, ordersCount: orders.length, productsCount: products.length, lowStockCount: lowStockProducts.length, debtorsCount: debtors.length, totalDebt } } })
    }

    if (lowerQuery.includes('tushum') || lowerQuery.includes('savdo') || lowerQuery.includes('daromad') || contextType === 'sales') {
      reply = `📊 **Savdo va Tushum Tahlili:**\n\n` +
        `• **Jami tushum:** ${totalRevenue.toLocaleString()} so'm\n` +
        `• **Buyurtmalar soni:** ${orders.length} ta\n` +
        `• **Eng ko'p sotilgan mahsulot:** ${topSeller}\n` +
        `• **O'rtacha chek:** ${orders.length > 0 ? Math.round(totalRevenue / orders.length).toLocaleString() : 0} so'm\n\n` +
        `💡 **Tavsiya:** Yangi xaridorlarni jalb qilish uchun eng xaridorgir mahsulotlaringizga chegirma yoki Telegram bot orqali aksiyali post yuboring.`
      suggestions = [
        "Omborda kam qolgan tovarlarni ko'rsat",
        "Nasiya qarzlarini qanday yig'ish kerak?",
        "Telegram botda sotuvni oshirish yo'llari"
      ]
    } else if (lowerQuery.includes('ombor') || lowerQuery.includes('zaxira') || lowerQuery.includes('qoldiq') || lowerQuery.includes('mahsulot') || contextType === 'stock') {
      reply = `📦 **Ombor va Zaxira Prognozi:**\n\n` +
        `• **Jami mahsulot turlari:** ${products.length} ta\n` +
        `• **Tugagan mahsulotlar (0 dona):** ${outOfStockProducts.length} ta ${outOfStockProducts.length > 0 ? `(${outOfStockProducts.slice(0, 3).map(p => p.name).join(', ')})` : ''}\n` +
        `• **Zudlik bilan to'ldirish kerak (≤3 dona):** ${lowStockProducts.length} ta ${lowStockProducts.length > 0 ? `(${lowStockProducts.slice(0, 3).map(p => p.name).join(', ')})` : ''}\n\n` +
        `💡 **Tavsiya:** Tugagan tovarlar xaridorni raqobatchilarga olib ketishi mumkin. Yetkazib beruvchilar bilan bog'lanib, zaxirani zudlik bilan to'ldirishni tavsiya qilaman.`
      suggestions = [
        "Eng ko'p foyda keltiruvchi tovarlar",
        "Nasiya daftari hisoboti",
        "Sotuvni 30% oshirish bo'yicha maslahat"
      ]
    } else if (lowerQuery.includes('nasiya') || lowerQuery.includes('qarz') || lowerQuery.includes('mijoz') || contextType === 'debts') {
      reply = `💰 **Nasiya va Qarzdorlik CRM Tahlili:**\n\n` +
        `• **Jami qarzdorlar:** ${debtors.length} nafar mijoz\n` +
        `• **Umumiy qarz summasi:** ${totalDebt.toLocaleString()} so'm\n` +
        `• **Eng katta qarzdorlar:** ${debtors.slice(0, 3).map(d => `${d.name} (${(d.debt || 0).toLocaleString()} so'm)`).join(', ') || 'Qarzdorlar yo\'q'}\n\n` +
        `💡 **Tavsiya:** Qarzdor mijozlarga "Mijozlar" bo'limidagi **Telegram SMS Eslatma** tugmasi orqali muloyim eslatma yuboring va muddat o'tishining oldini oling.`
      suggestions = [
        "Mijozlarga Telegramdan eslatma yuborish",
        "VIP mijozlarni qanday rag'batlantirish mumkin?",
        "Bugungi tushumni tahlil qil"
      ]
    } else if (/^(salom|assalom|hi|hello|привет|здравствуй)/.test(lowerQuery.trim())) {
      reply = "Va alaykum assalom! 👋 Qanday yordam bera olaman? Savdo, ombor qoldig'i yoki nasiya qarzlari haqida so'rashingiz mumkin."
      suggestions = ["Bugungi savdo va tushumni tahlil qil", "Qaysi mahsulotlar zaxirasi kam qoldi?", "Nasiyador mijozlar ro'yxati va qarzlar"]
    } else {
      reply = `🤖 **OsonBiznes AI Maslahatchisi:**\n\n` +
        `Sizning do'koningizda hozirda:\n` +
        `• **${products.length}** xil mahsulot\n` +
        `• **${orders.length}** ta buyurtma (${totalRevenue.toLocaleString()} so'm)\n` +
        `• **${customers.length}** ta mijoz (${totalDebt.toLocaleString()} so'm nasiya qarz)\n\n` +
        `Savdoni oshirish, ombor zaxiralarini to'g'ri rejalashtirish yoki nasiya qarzlarini tezroq yig'ish bo'yicha qanday savolingiz bor?`
      suggestions = [
        "Bugungi savdo va tushumni tahlil qil",
        "Qaysi mahsulotlar zaxirasi kam qoldi?",
        "Nasiyador mijozlar ro'yxati va qarzlar",
        "Do'kon daromadini oshirish sirlari"
      ]
    }

    res.json({
      success: true,
      data: {
        reply,
        suggestions,
        metrics: {
          totalRevenue,
          ordersCount: orders.length,
          productsCount: products.length,
          lowStockCount: lowStockProducts.length,
          debtorsCount: debtors.length,
          totalDebt,
        },
      },
    })
  } catch (error) {
    console.error('AI advisor error:', error)
    res.status(500).json({ success: false, message: 'AI xizmatida xatolik yuz berdi' })
  }
})

module.exports = router
