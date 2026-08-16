const express = require('express')
const router = express.Router()
const Notification = require('../models/Notification')
const { authenticate } = require('../middleware/auth')

// GET /api/notifications - Barcha xabarnomalar
router.get('/', authenticate, async (req, res) => {
  try {
    const { limit = 20, offset = 0, unreadOnly } = req.query
    const filter = { userId: req.user.id }

    // Admin messages faqat admin ko'rsin
    if (req.user.role !== 'admin') {
      filter.type = { $ne: 'admin_message' }
    }

    if (unreadOnly === 'true') {
      filter.read = false
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(parseInt(offset))
        .limit(parseInt(limit))
        .lean(),
      Notification.countDocuments({ userId: req.user.id }),
      Notification.unreadCount(req.user.id),
    ])

    res.json({
      success: true,
      data: notifications,
      total,
      unreadCount,
      page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
    })
  } catch (error) {
    console.error('Notifications GET error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// GET /api/notifications/unread-count - O'qilmaganlar soni
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const count = await Notification.unreadCount(req.user.id)
    res.json({ success: true, data: { count } })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// PUT /api/notifications/:id/read - Xabarnomani o'qilgan deb belgilash
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { read: true, readAt: new Date() } },
      { new: true }
    )

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Xabarnoma topilmadi' })
    }

    res.json({ success: true, data: notification })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// PUT /api/notifications/read-all - Barchasini o'qilgan deb belgilash
router.put('/read-all', authenticate, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.user.id, read: false },
      { $set: { read: true, readAt: new Date() } }
    )

    res.json({
      success: true,
      data: { markedRead: result.modifiedCount },
      message: `${result.modifiedCount} ta xabarnoma oqilgan belgilandi`,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// DELETE /api/notifications/:id - Xabarnomani o'chirish
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    })

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Xabarnoma topilmadi' })
    }

    res.json({ success: true, message: 'Xabarnoma ochirildi' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

module.exports = router
