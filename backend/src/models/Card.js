const mongoose = require('mongoose')

const cardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  cardMask: {
    type: String,
    required: true,
  },
  cardName: {
    type: String,
    default: 'Karta egasi',
  },
  method: {
    type: String,
    enum: ['click', 'payme', 'card'],
    default: 'click',
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
})

cardSchema.index({ userId: 1, isActive: 1 })

module.exports = mongoose.model('Card', cardSchema)
