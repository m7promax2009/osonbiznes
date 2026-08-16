const mongoose = require('mongoose')

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  method: {
    type: String,
    enum: ['click', 'payme', 'cash', 'card', 'transfer'],
    required: true,
  },
  type: {
    type: String,
    enum: ['subscription', 'order', 'other'],
    default: 'subscription',
  },
  tariff: {
    type: String,
    enum: ['start', 'pro', 'business', ''],
    default: '',
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'refunded'],
    default: 'pending',
  },
  transactionId: {
    type: String,
    default: '',
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
})

// Indekslar
paymentSchema.index({ userId: 1, createdAt: -1 })
paymentSchema.index({ status: 1 })
paymentSchema.index({ method: 1 })

module.exports = mongoose.model('Payment', paymentSchema)
