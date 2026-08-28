const express = require('express')
const mongoose = require('mongoose')
const router = express.Router()
const Product = require('../models/Product')
const User = require('../models/User')
const Order = require('../models/Order')
const Notification = require('../models/Notification')
const { escapeRegex } = require('../utils/sanitize')
const { rateLimit } = require('../middleware/rateLimit')

// Ochiq (autentifikatsiyasiz) endpoint — spam/DoS'dan himoya uchun rate limit
const orderLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, message: "Juda ko'p buyurtma so'rovi. Birozdan keyin urinib ko'ring." })

// GET /api/telegram/shops - Public: barcha faol do'konlar ro'yxati
router.get('/shops', async (req, res) => {
  try {
    const shops = await User.find({
      role: 'shop_owner',
      isActive: true,
      tariff: { $in: ['trial', 'start', 'pro', 'business'] },
    }).select('name business email phone description tariff').lean()

    res.json({ success: true, data: shops, total: shops.length })
  } catch (error) {
    console.error('Telegram shops error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// GET /api/telegram/products/:ownerId - Public: do'kon mahsulotlari
router.get('/products/:ownerId', async (req, res) => {
  try {
    const products = await Product.find({
      userId: req.params.ownerId,
      isActive: { $ne: false },
    }).select('name price category stock sku userId').sort({ createdAt: -1 }).limit(30).lean()

    res.json({ success: true, data: products })
  } catch (error) {
    console.error('Telegram products error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// GET /api/telegram/products - Public: barcha mahsulotlar (do'kon nomi bilan)
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find({
      isActive: { $ne: false },
    }).populate('userId', 'business name').sort({ createdAt: -1 }).limit(50).lean()

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

    // Find first active shop owner if ownerId not specified
    let userId = ownerId
    if (!userId) {
      const firstShop = await User.findOne({
        role: 'shop_owner',
        isActive: true,
        tariff: { $in: ['trial', 'start', 'pro', 'business'] },
      }).select('_id').lean()
      if (!firstShop) {
        return res.status(404).json({ success: false, message: 'Faol do\'kon topilmadi' })
      }
      userId = firstShop._id
    }
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: 'Notogri do\'kon' })
    }

    // MUHIM: narx va qoldiqni SERVER tomonida mahsulot bazasidan olamiz.
    // Mijoz yuborgan narx/summaga ISHONMAYMIZ (aks holda 0 so'mlik yoki soxta savdo yoziladi).
    const orderItems = []
    for (const raw of items) {
      const qty = Number(raw.qty) || 1
      if (!Number.isInteger(qty) || qty < 1) {
        return res.status(400).json({ success: false, message: 'Miqdor notogri' })
      }
      let product = null
      if (raw.productId && mongoose.isValidObjectId(raw.productId)) {
        product = await Product.findOne({ _id: raw.productId, userId, isActive: { $ne: false } })
      }
      if (!product && raw.name) {
        product = await Product.findOne({
          userId,
          isActive: { $ne: false },
          name: { $regex: `^${escapeRegex(raw.name)}$`, $options: 'i' },
        })
      }
      if (!product) {
        return res.status(400).json({ success: false, message: `Mahsulot topilmadi: ${raw.name || raw.productId}` })
      }
      if (product.stock < qty) {
        return res.status(400).json({ success: false, message: `"${product.name}" yetarli emas (qoldiq: ${product.stock})` })
      }
      orderItems.push({ productId: product._id, name: product.name, qty, price: product.price, category: product.category })
    }

    const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.qty, 0)
    const orderTotal = subtotal

    const { paymentMethod = 'cash' } = req.body
    const isCardPaid = paymentMethod === 'card' || req.body.paymentStatus === 'paid'

    const order = await Order.createOrder({
      userId,
      customer,
      phone: phone || '',
      items: orderItems.map(({ productId, ...rest }) => rest),
      subtotal,
      total: orderTotal,
      status: 'pending',
      payment: isCardPaid ? 'paid' : 'unpaid',
      paymentMethod: paymentMethod || 'cash',
      source: req.body.source || 'website',
      address: address || '',
      deliveryMethod: deliveryMethod || 'pickup',
    })

    // Qoldiqni kamaytirish — stock >= qty sharti manfiy qoldiqning oldini oladi
    for (const item of orderItems) {
      await Product.updateOne(
        { _id: item.productId, userId, stock: { $gte: item.qty } },
        { $inc: { stock: -item.qty } }
      )
    }

    // Update user stats
    await User.findByIdAndUpdate(userId, {
      $inc: { totalOrders: 1, totalRevenue: orderTotal },
    })

    const deliveryInfo = deliveryMethod === 'delivery'
      ? `Yetkazib berish: ${address || 'Manzil kiritilmagan'}`
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
        message: `${customer} dan ${orderTotal.toLocaleString()} so'm lik buyurtma\n📦 ${itemsList}\n📞 ${phone || "Ko'rsatilmagan"}${deliveryInfo ? `\n${deliveryInfo}` : ''}`,
        data: {
          orderId: order._id,
          total: orderTotal,
          source: 'telegram',
          customer,
          phone,
          address,
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

// GET /api/telegram/stats
router.get('/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      active: true,
      subscribers: 248,
      monthlyOrders: 56,
      conversionRate: '89%',
      monthlyRevenue: 12400000,
      botUsername: '@OSSON_BIZNES_BOT',
      botToken: process.env.TELEGRAM_BOT_TOKEN ? '********' + process.env.TELEGRAM_BOT_TOKEN.slice(-4) : 'Not configured',
    },
  })
})

// POST /api/telegram/toggle
router.post('/toggle', (req, res) => {
  res.json({ success: true, data: { active: true } })
})

// POST /api/telegram/send
router.post('/send', (req, res) => {
  const { chatId, message } = req.body
  if (!chatId || !message) {
    return res.status(400).json({ success: false, message: 'chatId va message majburiy' })
  }
  res.json({ success: true, message: 'Xabar yuborish navbatiga qoshildi' })
})

module.exports = router
