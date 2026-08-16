const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: [
      'new_order',
      'order_status',
      'trial_expiring',
      'subscription_expired',
      'payment_success',
      'payment_failed',
      'low_stock',
      'new_customer',
      'system',
      'admin_message',
    ],
    required: true,
  },
  title: {
    type: String,
    required: true,
    maxlength: 200,
  },
  message: {
    type: String,
    required: true,
    maxlength: 500,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  urgent: {
    type: Boolean,
    default: false,
  },
  read: {
    type: Boolean,
    default: false,
    index: true,
  },
  readAt: Date,
}, {
  timestamps: true,
})

// Automatically set readAt when marking as read
notificationSchema.pre('save', function(next) {
  if (this.isModified('read') && this.read && !this.readAt) {
    this.readAt = new Date()
  }
  next()
})

// Virtual for time ago
notificationSchema.virtual('timeAgo').get(function() {
  const diff = Date.now() - this.createdAt
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Hozir'
  if (minutes < 60) return `${minutes} daqiqa oldin`
  if (hours < 24) return `${hours} soat oldin`
  if (days < 7) return `${days} kun oldin`
  return this.createdAt?.toLocaleDateString('uz-UZ') || ''
})

// Static: create notification helper
notificationSchema.statics.send = async function({ userId, type, title, message, data = {}, urgent = false }) {
  return this.create({ userId, type, title, message, data, urgent })
}

// Static: get unread count
notificationSchema.statics.unreadCount = async function(userId) {
  return this.countDocuments({ userId, read: false })
}

module.exports = mongoose.model('Notification', notificationSchema)
