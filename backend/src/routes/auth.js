const express = require('express')
const router = express.Router()
const User = require('../models/User')
const { authenticate } = require('../middleware/auth')
const { signToken } = require('../config/jwt')
const { rateLimit } = require('../middleware/rateLimit')

// Login/register brute-force himoyasi: IP'dan 15 daqiqada 30 urinish
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: "Juda ko'p urinish. 15 daqiqadan keyin qayta urinib ko'ring." })

// POST /api/auth/register - Registration
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password, business, phone } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Ism, email va parol majburiy' })
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Parol kamida 6 belgi bolishi kerak' })
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Bu email allaqachon royhatdan otgan' })
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      business: business || '',
      phone: phone || '',
      role: 'shop_owner',
      tariff: 'trial',
      trialStartedAt: new Date(),
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    })

    const token = signToken({ id: user._id })

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          business: user.business,
          phone: user.phone,
          tariff: user.tariff,
          trialDaysLeft: user.trialDaysLeft,
        },
      },
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email va parolni kiriting' })
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password')
    if (!user) {
      return res.status(401).json({ success: false, message: 'Notogri email yoki parol' })
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Hisobingiz bloklangan. Administrator bilan bog`laning.' })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Notogri email yoki parol' })
    }

    user.lastLogin = new Date()
    await user.save()

    const token = signToken({ id: user._id })

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          business: user.business,
          phone: user.phone,
          tariff: user.tariff,
          tariffStatus: user.tariffStatus,
          trialDaysLeft: user.trialDaysLeft,
          totalOrders: user.totalOrders,
          totalRevenue: user.totalRevenue,
          totalCustomers: user.totalCustomers,
          totalProducts: user.totalProducts,
        },
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' })
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        business: user.business,
        phone: user.phone,
        tariff: user.tariff,
        tariffStatus: user.tariffStatus,
        trialDaysLeft: user.trialDaysLeft,
        trialEndsAt: user.trialEndsAt,
        subscriptionStart: user.subscriptionStart,
        subscriptionEnd: user.subscriptionEnd,
        autoPayment: user.autoPayment,
        paymentMethod: user.paymentMethod,
        totalOrders: user.totalOrders,
        totalRevenue: user.totalRevenue,
        totalCustomers: user.totalCustomers,
        totalProducts: user.totalProducts,
      },
    })
  } catch (error) {
    console.error('Profile error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// PUT /api/auth/profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, business, phone } = req.body
    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' })

    if (name) user.name = name
    if (business !== undefined) user.business = business
    if (phone !== undefined) user.phone = phone

    await user.save()

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        business: user.business,
        phone: user.phone,
      },
    })
  } catch (error) {
    console.error('Profile update error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// PUT /api/auth/password
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const user = await User.findById(req.user.id).select('+password')
    if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' })

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Joriy va yangi parolni kiriting' })
    }

    const isMatch = await user.comparePassword(currentPassword)
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Joriy parol notogri' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Yangi parol kamida 6 belgi' })
    }

    user.password = newPassword
    await user.save()

    res.json({ success: true, message: 'Parol muvaffaqiyatli ozgartirildi' })
  } catch (error) {
    console.error('Password change error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

module.exports = router
