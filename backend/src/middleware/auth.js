const { verifyToken } = require('../config/jwt')
const User = require('../models/User')

// Token autentifikatsiya
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({ success: false, message: 'Token talab qilinadi. Iltimos, tizimga kiring.' })
    }

    const decoded = verifyToken(token)
    const user = await User.findById(decoded.id)

    if (!user) {
      return res.status(401).json({ success: false, message: 'Foydalanuvchi topilmadi' })
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Hisobingiz bloklangan' })
    }

    // Foydalanuvchi session ga qo'shamiz
    req.user = {
      id: user._id,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      business: user.business,
      tariff: user.tariff,
      tariffStatus: user.tariffStatus,
      trialDaysLeft: user.trialDaysLeft,
      ownerId: user.ownerId, // usta uchun: ustaxona egasi id
      specialty: user.specialty,
    }

    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token muddati tugagan. Qayta kiring.' })
    }
    return res.status(403).json({ success: false, message: 'Token yaroqsiz' })
  }
}

// Faqat admin
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Sizda admin huquqi yoq' })
  }
  next()
}

// Faqat shop_owner
function requireShopOwner(req, res, next) {
  if (!req.user || req.user.role !== 'shop_owner') {
    return res.status(403).json({ success: false, message: 'Sizda do kon egasi huquqi yoq' })
  }
  next()
}

// Aktiv obunani tekshirish
function requireActiveSubscription(req, res, next) {
  const status = req.user.tariffStatus
  if (status === 'blocked') {
    return res.status(403).json({ success: false, message: 'Hisobingiz bloklangan' })
  }
  if (status === 'trial_expired' || status === 'subscription_expired') {
    return res.status(402).json({
      success: false,
      message: 'Obuna muddati tugagan. Iltimos, tarifni yangilang.',
      requirePayment: true,
      tariff: req.user.tariff,
    })
  }
  next()
}

module.exports = { authenticate, requireAdmin, requireShopOwner, requireActiveSubscription }
