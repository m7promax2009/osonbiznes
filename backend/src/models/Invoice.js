const mongoose = require('mongoose')

const invoiceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null,
  },
  invoiceNumber: {
    type: String,
    // Global unique EMAS — har do'kon ichida ketma-ket (compound index pastda).
  },
  customer: {
    type: String,
    required: true,
    trim: true,
  },
  items: [{
    name: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  }],
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  taxRate: {
    type: Number,
    default: 0, // 10% QQS uchun 10
  },
  tax: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'cancelled'],
    default: 'pending',
  },
  dueDate: {
    type: Date,
  },
  notes: {
    type: String,
    trim: true,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
})

// Hisob-fakturani ketma-ket raqam bilan yaratish (collision'ga chidamli).
invoiceSchema.statics.createInvoice = async function (data) {
  const date = new Date()
  const prefix = `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`
  const base = await this.countDocuments({
    userId: data.userId,
    invoiceNumber: { $regex: `^${prefix}` },
  })
  for (let attempt = 0; attempt < 6; attempt++) {
    const invoiceNumber = `${prefix}-${String(base + 1 + attempt).padStart(4, '0')}`
    try {
      return await this.create({ ...data, invoiceNumber })
    } catch (err) {
      if (err.code === 11000 && attempt < 5) continue
      throw err
    }
  }
}

// Indekslar
invoiceSchema.index({ userId: 1, status: 1 })
invoiceSchema.index({ userId: 1, createdAt: -1 })
invoiceSchema.index({ userId: 1, invoiceNumber: 1 }, { unique: true })

module.exports = mongoose.model('Invoice', invoiceSchema)
