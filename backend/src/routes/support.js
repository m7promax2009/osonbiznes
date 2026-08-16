const express = require('express')
const router = express.Router()
const Notification = require('../models/Notification')
const User = require('../models/User')

// POST /api/support - Send support message to admin
router.post('/', async (req, res) => {
  try {
    const { subject, message } = req.body

    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Mavzu va xabar matni majburiy' })
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
        title: `Yordam: ${subject}`,
        message: `${userName}${userEmail ? ` (${userEmail})` : ''}: ${message}`,
        data: { subject, senderId: senderId?.toString() },
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
