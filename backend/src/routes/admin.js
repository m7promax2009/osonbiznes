const express = require('express')
const router = express.Router()
const User = require('../models/User')
const Payment = require('../models/Payment')
const Order = require('../models/Order')
const Product = require('../models/Product')
const Customer = require('../models/Customer')
const { authenticate, requireAdmin } = require('../middleware/auth')
const { safeSearchRegex } = require('../utils/sanitize')

// Barcha routelar faqat admin uchun
router.use(authenticate, requireAdmin)

const SUBSCRIPTION_DAYS = 30

// GET /api/admin/dashboard - Admin dashboard statistikasi
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalShops,
      activeShops,
      trialShops,
      paidShops,
      totalOrders,
      totalRevenue,
      recentPayments,
      recentShops,
    ] = await Promise.all([
      User.countDocuments({ role: 'shop_owner' }),
      User.countDocuments({ role: 'shop_owner', isActive: true, tariff: { $in: ['start', 'pro', 'business'] } }),
      User.countDocuments({ role: 'shop_owner', tariff: 'trial' }),
      User.countDocuments({ role: 'shop_owner', tariff: { $in: ['start', 'pro', 'business'] } }),
      Order.countDocuments({}),
      Order.aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }]),
      Payment.find().sort({ createdAt: -1 }).limit(5).populate('userId', 'name email business'),
      User.find({ role: 'shop_owner' }).sort({ createdAt: -1 }).limit(5).select('-password'),
    ])

    // Monthly revenue
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    
    const monthlyPayments = await Payment.aggregate([
      { $match: { createdAt: { $gte: startOfMonth }, status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ])

    res.json({
      success: true,
      data: {
        totalShops,
        activeShops,
        trialShops,
        paidShops,
        blockedShops: await User.countDocuments({ role: 'shop_owner', tariff: 'blocked' }),
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        monthlyRevenue: monthlyPayments[0]?.total || 0,
        totalProducts: await Product.countDocuments({ isActive: true }),
        totalCustomers: await Customer.countDocuments({ isActive: true }),
        recentPayments,
        recentShops,
      },
    })
  } catch (error) {
    console.error('Admin dashboard error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// GET /api/admin/users - Barcha shop ownerlar
router.get('/users', async (req, res) => {
  try {
    const { search, tariff, page = 1, limit = 20 } = req.query
    const filter = { role: 'shop_owner' }

    if (tariff && tariff !== 'all') filter.tariff = tariff
    if (search) {
      filter.$or = [
        { name: safeSearchRegex(search) },
        { email: safeSearchRegex(search) },
        { business: safeSearchRegex(search) },
      ]
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).select('-password'),
      User.countDocuments(filter),
    ])

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    })
  } catch (error) {
    console.error('Admin users error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// GET /api/admin/users/:id - Bitta shop owner
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password')
    if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' })

    const [products, orders, customers, payments] = await Promise.all([
      Product.countDocuments({ userId: user._id }),
      Order.countDocuments({ userId: user._id }),
      Customer.countDocuments({ userId: user._id }),
      Payment.find({ userId: user._id }).sort({ createdAt: -1 }).limit(10),
    ])

    res.json({
      success: true,
      data: {
        ...user.toJSON(),
        stats: { products, orders, customers },
        payments,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// PUT /api/admin/users/:id - Shop ownerni tahrirlash
router.put('/users/:id', async (req, res) => {
  try {
    const { name, business, phone, tariff, isActive } = req.body
    const update = {}
    if (name !== undefined) update.name = name
    if (business !== undefined) update.business = business
    if (phone !== undefined) update.phone = phone
    if (isActive !== undefined) update.isActive = isActive

    if (tariff) {
      update.tariff = tariff
      if (tariff === 'start') {
        update.subscriptionStart = new Date()
        update.subscriptionEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      } else if (tariff === 'pro') {
        update.subscriptionStart = new Date()
        update.subscriptionEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      } else if (tariff === 'business') {
        update.subscriptionStart = new Date()
        update.subscriptionEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      } else if (tariff === 'trial') {
        update.trialStartedAt = new Date()
        update.trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      }
    }

    const user = await User.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).select('-password')
    if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' })

    res.json({ success: true, data: user })
  } catch (error) {
    console.error('Admin update user error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// POST /api/admin/users - Yangi shop owner yaratish (admin tomonidan)
router.post('/users', async (req, res) => {
  try {
    const { name, email, password, business, phone, tariff } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Ism, email va parol majburiy' })
    }

    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      return res.status(400).json({ success: false, message: 'Bu email allaqachon royhatdan otgan' })
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: 'shop_owner',
      business: business || '',
      phone: phone || '',
      tariff: tariff || 'trial',
    })

    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        business: user.business,
        phone: user.phone,
        tariff: user.tariff,
      },
    })
  } catch (error) {
    console.error('Admin create user error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// GET /api/admin/payments - To'lovlar tarixi
router.get('/payments', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query
    const filter = {}

    if (status && status !== 'all') filter.status = status

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('userId', 'name email business'),
      Payment.countDocuments(filter),
    ])

    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ])

    res.json({
      success: true,
      data: payments,
      totalRevenue: totalRevenue[0]?.total || 0,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    })
  } catch (error) {
    console.error('Admin payments error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// PUT /api/admin/payments/:id/approve - To'lovni tasdiqlab, obunani faollashtirish.
// Bu YAGONA ishonchli faollashtirish yo'li (foydalanuvchi o'zi tasdiqlay olmaydi).
router.put('/payments/:id/approve', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
    if (!payment) return res.status(404).json({ success: false, message: 'Tolov topilmadi' })
    if (payment.status === 'success') {
      return res.status(400).json({ success: false, message: 'Tolov allaqachon tasdiqlangan' })
    }

    payment.status = 'success'
    await payment.save()

    // Obuna tariflari uchun foydalanuvchini yangilash
    if (payment.type === 'subscription' && payment.tariff) {
      const user = await User.findById(payment.userId)
      if (user) {
        user.tariff = payment.tariff
        user.subscriptionStart = new Date()
        user.subscriptionEnd = new Date(Date.now() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000)
        user.paymentMethod = payment.method
        await user.save()
      }
    }

    res.json({ success: true, data: payment })
  } catch (error) {
    console.error('Payment approve error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// PUT /api/admin/payments/:id/reject - To'lovni rad etish
router.put('/payments/:id/reject', async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'failed' } },
      { new: true }
    )
    if (!payment) return res.status(404).json({ success: false, message: 'Tolov topilmadi' })
    res.json({ success: true, data: payment })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// GET /api/admin/subscriptions - Obuna statistikasi
router.get('/subscriptions', async (req, res) => {
  try {
    const subscriptions = await User.aggregate([
      { $match: { role: 'shop_owner' } },
      {
        $group: {
          _id: '$tariff',
          count: { $sum: 1 },
        },
      },
    ])

    // Trial tugaydiganlar
    const expiringTrials = await User.countDocuments({
      role: 'shop_owner',
      tariff: 'trial',
      trialEndsAt: { $lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), $gte: new Date() },
    })

    // Mudati o'tganlar
    const expiredSubscriptions = await User.countDocuments({
      role: 'shop_owner',
      tariff: { $in: ['start', 'pro', 'business'] },
      subscriptionEnd: { $lte: new Date() },
    })

    res.json({
      success: true,
      data: {
        breakdown: subscriptions,
        total: subscriptions.reduce((sum, s) => sum + s.count, 0),
        expiringTrials,
        expiredSubscriptions,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

module.exports = router
