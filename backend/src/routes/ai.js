const express = require('express')
const router = express.Router()
const Product = require('../models/Product')
const Order = require('../models/Order')
const Customer = require('../models/Customer')
const { authenticate } = require('../middleware/auth')

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

    const lowerQuery = message.toLowerCase()
    let reply = ''
    let suggestions = []

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
