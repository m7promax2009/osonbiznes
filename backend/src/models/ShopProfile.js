const mongoose = require('mongoose')

const shopProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
    maxlength: 500,
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
  // Xarita uchun koordinatalar
  latitude: {
    type: Number,
    default: null,
  },
  longitude: {
    type: Number,
    default: null,
  },
  rating: {
    type: Number,
    default: 5.0,
    min: 0,
    max: 5,
  },
  reviewCount: {
    type: Number,
    default: 0,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  showOnMarketplace: {
    type: Boolean,
    default: false,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  featuredUntil: {
    type: Date,
    default: null,
  },
  bannerColor: {
    type: String,
    default: 'from-emerald-600 to-emerald-800',
  },
  // Kategoriyalar (qulaylik uchun array)
  categories: [{
    type: String,
    trim: true,
  }],
  // Filiallar (bir salon bir nechta filialga ega bo'lishi mumkin)
  branches: [{
    name: { type: String, default: '' },
    address: { type: String, default: '' },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    phone: { type: String, default: '' },
  }],
  // Telegram bot username
  botUsername: {
    type: String,
    default: '',
  },
  views: {
    type: Number,
    default: 0,
  },
  productCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
})

// Indekslar
shopProfileSchema.index({ showOnMarketplace: 1, isFeatured: -1 })
shopProfileSchema.index({ city: 1 })
shopProfileSchema.index({ categories: 1 })

module.exports = mongoose.model('ShopProfile', shopProfileSchema)
