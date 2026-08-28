const mongoose = require('mongoose')

const customerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Mijoz ismi majburiy'],
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: '',
  },
  address: {
    type: String,
    trim: true,
    default: '',
  },
  city: {
    type: String,
    trim: true,
    default: '',
  },
  notes: {
    type: String,
    trim: true,
    default: '',
  },
  tags: [{
    type: String,
    trim: true,
  }],
  // Statistika
  totalOrders: {
    type: Number,
    default: 0,
  },
  totalSpent: {
    type: Number,
    default: 0,
  },
  lastOrderDate: Date,
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
  },
  // Sodiqlik va Nasiya (Debt CRM)
  debt: {
    type: Number,
    default: 0,
    min: 0,
  },
  debtDueDate: {
    type: Date,
    default: null,
  },
  cashback: {
    type: Number,
    default: 0,
    min: 0,
  },
  tier: {
    type: String,
    enum: ['Bronze', 'Silver', 'Gold', 'Platinum'],
    default: 'Bronze',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
})

// Indekslar
customerSchema.index({ userId: 1, name: 'text' })
customerSchema.index({ userId: 1, phone: 1 })
customerSchema.index({ userId: 1, totalSpent: -1 })

module.exports = mongoose.model('Customer', customerSchema)
