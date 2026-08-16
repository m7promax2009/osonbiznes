const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Mahsulot nomi majburiy'],
    trim: true,
    maxlength: [200, 'Nomi 200 harfdan oshmasligi kerak'],
  },
  category: {
    type: String,
    trim: true,
    default: 'Boshqa',
  },
  price: {
    type: Number,
    required: [true, 'Narx majburiy'],
    min: [0, 'Narx 0 dan kichik bolmasligi kerak'],
  },
  cost: {
    type: Number,
    default: 0,
    min: 0,
  },
  stock: {
    type: Number,
    default: 0,
    min: 0,
  },
  sku: {
    type: String,
    trim: true,
    default: '',
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  images: {
    type: [String],
    default: [],
  },
  status: {
    type: String,
    enum: ['active', 'low', 'out'],
    default: 'active',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
})

// Statusni avtomatik hisoblash
productSchema.pre('save', function(next) {
  if (this.stock <= 0) {
    this.status = 'out'
  } else if (this.stock < 5) {
    this.status = 'low'
  } else {
    this.status = 'active'
  }
  next()
})

// Indekslar
productSchema.index({ userId: 1, name: 'text' })
productSchema.index({ userId: 1, status: 1 })
productSchema.index({ userId: 1, category: 1 })

module.exports = mongoose.model('Product', productSchema)
