const express = require('express')
const mongoose = require('mongoose')
const router = express.Router()
const { normalizePhone } = require('../services/phone')
const Product = require('../models/Product')
const User = require('../models/User')
const Order = require('../models/Order')
const Notification = require('../models/Notification')
const { getPublicShopIds } = require('../services/publicShops')
const { reserveStock, releaseStock, StockError } = require('../services/stock')
const { rateLimit } = require('../middleware/rateLimit')

// Ochiq (autentifikatsiyasiz) endpoint — spam/DoS'dan himoya uchun rate limit
const orderLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, message: "Juda ko'p buyurtma so'rovi. Birozdan keyin urinib ko'ring." })

// GET /api/telegram/shops - Public: faol do'konlar ro'yxati
router.get('/shops', async (req, res) => {
  try {
    const ids = await getPublicShopIds()
    const shops = await User.find({ _id: { $in: ids } }).select('name business description').lean()
    res.json({ success: true, data: shops, total: shops.length })
  } catch (error) {
    console.error('Telegram shops error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// GET /api/telegram/products/:ownerId - Public: do'kon mahsulotlari
router.get('/products/:ownerId', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.ownerId)) {
      return res.status(404).json({ success: false, message: "Do'kon topilmadi" })
    }
    const ids = await getPublicShopIds()
    if (!ids.some(id => id.equals(req.params.ownerId))) {
      return res.json({ success: true, data: [] })
    }
    const products = await Product.find({
      userId: req.params.ownerId,
      isActive: { $ne: false },
      stock: { $gt: 0 },
    }).select('name price category stock sku userId').sort({ createdAt: -1 }).limit(30).lean()

    res.json({ success: true, data: products })
  } catch (error) {
    console.error('Telegram products error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// POST /api/telegram/order - Public: Telegram orqali buyurtma yaratish
router.post('/order', orderLimiter, async (req, res) => {
  try {
    const { customer, phone, items, source = 'telegram', ownerId, address, deliveryMethod } = req.body

    if (!customer || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ success: false, message: 'Mijoz va mahsulotlar majburiy' })
    }

    // Do'kon ANIQ ko'rsatilishi shart (aks holda buyurtma begona do'konga tushardi)
    const userId = ownerId
    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: "Do'kon ko'rsatilmagan" })
    }
    const publicIds = await getPublicShopIds()
    if (!publicIds.some(id => id.equals(userId))) {
      return res.status(404).json({ success: false, message: "Do'kon hozir buyurtma qabul qilmaydi" })
    }
    if (String(customer).length > 100 || String(phone || '').length > 30 || String(address || '').length > 300) {
      return res.status(400).json({ success: false, message: "Ma'lumotlar juda uzun" })
    }
    // Saytdan (OsonBozor) kelgan buyurtma: telefon va manzil qat'iy tekshiriladi.
    // Telegram bot erkin matn yuboradi — uning oqimi buzilmasligi uchun qoidalar faqat saytga.
    let cleanPhone = phone || ''
    let cleanAddress = address || ''
    let location
    if (source === 'website') {
      cleanPhone = normalizePhone(phone)
      if (!cleanPhone) {
        return res.status(400).json({ success: false, message: "Telefon raqami 9 ta raqamdan iborat bo'lishi kerak (masalan: 90 123 45 67)" })
      }
      if (deliveryMethod === 'delivery') {
        const a = req.body.addressDetails || {}
        const str = (v, max = 120) => String(v || '').trim().slice(0, max)
        const parts = { city: str(a.city, 60), district: str(a.district, 60), street: str(a.street), house: str(a.house, 20), apartment: str(a.apartment, 20), landmark: str(a.landmark) }
        if (!parts.city || !parts.district || parts.street.length < 3 || !parts.house) {
          return res.status(400).json({ success: false, message: "Manzilni to'liq kiriting: shahar, tuman, ko'cha va uy raqami" })
        }
        const lat = Number(req.body.location?.lat)
        const lng = Number(req.body.location?.lng)
        // O'zbekiston chegaralari (taxminiy to'rtburchak)
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 37 || lat > 45.7 || lng < 55.9 || lng > 73.2) {
          return res.status(400).json({ success: false, message: "Xaritada yetkazish nuqtasini belgilang" })
        }
        location = { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 }
        cleanAddress = [
          parts.city,
          parts.district,
          parts.street,
          `${parts.house}-uy`,
          parts.apartment && `${parts.apartment}-xonadon`,
          parts.landmark && `mo'ljal: ${parts.landmark}`,
        ].filter(Boolean).join(', ')
      }
    }

    if (items.length > 50) {
      return res.status(400).json({ success: false, message: "Mahsulotlar soni juda ko'p" })
    }

    // MUHIM: narx va qoldiqni SERVER tomonida mahsulot bazasidan olamiz.
    // Mijoz yuborgan narx/summaga ISHONMAYMIZ (aks holda 0 so'mlik yoki soxta savdo yoziladi).
    const requested = []
    for (const raw of items) {
      const qty = Number(raw.qty) || 1
      if (!Number.isInteger(qty) || qty < 1 || qty > 1000) {
        return res.status(400).json({ success: false, message: 'Miqdor notogri' })
      }
      requested.push({ productId: raw.productId, name: typeof raw.name === 'string' ? raw.name : '', qty })
    }

    let reserved
    try {
      reserved = await reserveStock(userId, requested, { strict: true })
    } catch (err) {
      if (err instanceof StockError) return res.status(400).json({ success: false, message: err.message })
      throw err
    }

    const products = await Product.find({ _id: { $in: reserved.map(i => i.productId) } })
      .select('name price category').lean()
    const byId = new Map(products.map(p => [p._id.toString(), p]))
    const orderItems = reserved.map(i => {
      const p = byId.get(i.productId.toString())
      return { productId: p._id, name: p.name, qty: i.qty, price: p.price, category: p.category }
    })

    const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.qty, 0)
    const orderTotal = subtotal

    // To'lov holati mijoz so'roviga qarab "paid" QILINMAYDI — faqat do'kon egasi tasdiqlaydi.
    const ALLOWED_PM = ['cash', 'click', 'payme', 'card', 'transfer']
    const paymentMethod = ALLOWED_PM.includes(req.body.paymentMethod) ? req.body.paymentMethod : 'cash'
    const orderSource = ['telegram', 'website'].includes(source) ? source : 'website'

    let order
    try {
      order = await Order.createOrder({
        userId,
        customer: String(customer).trim(),
        phone: cleanPhone,
        items: orderItems,
        subtotal,
        total: orderTotal,
        status: 'pending',
        payment: 'unpaid',
        paymentMethod,
        source: orderSource,
        address: cleanAddress,
        ...(location ? { location } : {}),
        deliveryMethod: ['pickup', 'delivery'].includes(deliveryMethod) ? deliveryMethod : 'pickup',
      })
    } catch (err) {
      await releaseStock(userId, orderItems)
      throw err
    }

    // Update user stats
    await User.findByIdAndUpdate(userId, {
      $inc: { totalOrders: 1, totalRevenue: orderTotal },
    })

    const mapLink = location ? `https://yandex.uz/maps/?pt=${location.lng},${location.lat}&z=17&l=map` : ''
    const deliveryInfo = deliveryMethod === 'delivery'
      ? `Yetkazib berish: ${cleanAddress || 'Manzil kiritilmagan'}${mapLink ? `\n📍 ${mapLink}` : ''}`
      : deliveryMethod === 'pickup'
        ? 'Olib ketish'
        : ''

    // Send notification to shop owner with all details
    try {
      const itemsList = orderItems.map(i => `${i.name} x${i.qty}`).join(', ')
      await Notification.send({
        userId,
        type: 'new_order',
        title: '🛵 Yangi buyurtma!',
        message: `${customer} dan ${orderTotal.toLocaleString()} so'm lik buyurtma\n📦 ${itemsList}\n📞 ${phone || "Ko'rsatilmagan"}${deliveryInfo ? `\n${deliveryInfo}` : ''}`.slice(0, 500),
        data: {
          orderId: order._id,
          total: orderTotal,
          source: orderSource,
          customer,
          phone: cleanPhone,
          address: cleanAddress,
          location,
          mapLink,
          deliveryMethod,
          items: itemsList,
        },
        urgent: true,
      })
    } catch (err) {
      console.error('Telegram notification error:', err.message)
    }

    res.status(201).json({
      success: true,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        total: orderTotal,
      },
      message: 'Buyurtma qabul qilindi!',
    })
  } catch (error) {
    console.error('Telegram order error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

module.exports = router
