const express = require('express')
const router = express.Router()
const Notification = require('../models/Notification')
const User = require('../models/User')
const { rateLimit } = require('../middleware/rateLimit')

// Ochiq endpoint — admin bildirishnomalarini spam qilishdan himoya
const crypto = require('crypto')
const publicLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: "Juda ko'p murojaat. Birozdan keyin urinib ko'ring." })
// AI sotuv agenti barcha mijozlar nomidan bitta IP'dan yozadi — unga alohida (kattaroq) limit
const agentLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 120, message: "Agent limiti tugadi." })

function isAgent(req) {
  const expected = process.env.AGENT_API_KEY
  const given = req.get('x-agent-key')
  if (!expected || expected.length < 24 || !given) return false
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

function supportLimiter(req, res, next) {
  return isAgent(req) ? agentLimiter(req, res, next) : publicLimiter(req, res, next)
}

// POST /api/support - Send support message to admin
router.post('/', supportLimiter, async (req, res) => {
  try {
    const { subject, message } = req.body

    if (!subject || !message || typeof subject !== 'string' || typeof message !== 'string') {
      return res.status(400).json({ success: false, message: 'Mavzu va xabar matni majburiy' })
    }
    if (subject.length > 150 || message.length > 2000) {
      return res.status(400).json({ success: false, message: 'Mavzu (150) yoki xabar (2000) juda uzun' })
    }

    // Extract user info if authenticated
    let userName = 'Anonim foydalanuvchi'
    let userEmail = null
    let senderId = null

    try {
      const authHeader = req.headers.authorization
      if (authHeader) {
        const { verifyToken } = require('../config/jwt')
        const token = authHeader.split(' ')[1]
        const decoded = verifyToken(token)
        const user = await User.findById(decoded.id)
        if (user) {
          senderId = user._id
          userName = user.name
          userEmail = user.email
        }
      }
    } catch (_) {}

    // Find admin user
    const admin = await User.findOne({ role: 'admin' })
    const adminId = admin?._id

    if (adminId) {
      await Notification.send({
        userId: adminId,
        type: 'admin_message',
        title: `Yordam: ${subject}`.slice(0, 200),
        message: `${userName}${userEmail ? ` (${userEmail})` : ''}: ${message}`.slice(0, 500),
        data: { subject, fullMessage: message, senderId: senderId?.toString() },
        urgent: true,
      })
    }

    console.log(`📞 SUPPORT from ${userName}: ${subject}`)

    res.json({
      success: true,
      message: 'Xabaringiz yuborildi!',
    })
  } catch (error) {
    console.error('Support error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

module.exports = router
