const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Ism majburiy'],
    trim: true,
    minlength: [2, 'Ism kamida 2 harf'],
    maxlength: [100, 'Ism 100 harfdan oshmasligi kerak'],
  },
  email: {
    type: String,
    required: [true, 'Email majburiy'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email format notogri'],
  },
  password: {
    type: String,
    required: [true, 'Parol majburiy'],
    minlength: [6, 'Parol kamida 6 belgi'],
    select: false,
  },
  role: {
    type: String,
    // shop_owner = ustaxona egasi; master = usta (ishchi)
    enum: ['admin', 'shop_owner', 'master'],
    default: 'shop_owner',
  },
  // Usta (master) uchun: qaysi ustaxona egasiga tegishli
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  // Usta/sartarosh mutaxassisligi
  specialty: { type: String, default: '' },
  // Sartarosh profili (marketplace uchun)
  avatar: { type: String, default: '' }, // emoji yoki rasm
  skills: { type: [String], default: [] }, // ["Fade", "Soqol", "Bola sochi"]
  rating: { type: Number, default: 5, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  priceFrom: { type: Number, default: 0 },
  branchName: { type: String, default: '' }, // qaysi filialda ishlaydi
  bio: { type: String, default: '' },
  business: {
    type: String,
    trim: true,
    default: '',
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  // Tarif ma'lumotlari
  tariff: {
    type: String,
    enum: ['trial', 'start', 'pro', 'business', 'blocked'],
    default: 'trial',
  },
  trialStartedAt: {
    type: Date,
    default: Date.now,
  },
  trialEndsAt: {
    type: Date,
    default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 kun
  },
  subscriptionStart: Date,
  subscriptionEnd: Date,
  autoPayment: {
    type: Boolean,
    default: false,
  },
  paymentMethod: {
    type: String,
    enum: ['click', 'payme', 'none'],
    default: 'none',
  },
  // Statistika
  totalOrders: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  totalCustomers: { type: Number, default: 0 },
  totalProducts: { type: Number, default: 0 },
  lastLogin: Date,
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})

// Parolni hash qilish
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

// Parolni tekshirish
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

// Tarif holatini tekshirish
userSchema.virtual('tariffStatus').get(function() {
  if (this.tariff === 'blocked') return 'blocked'
  if (this.tariff === 'trial') {
    if (this.trialEndsAt && new Date() > this.trialEndsAt) {
      return 'trial_expired'
    }
    return 'trial_active'
  }
  if (this.subscriptionEnd && new Date() > this.subscriptionEnd) {
    return 'subscription_expired'
  }
  return 'active'
})

// Trial kunlari qolgan
userSchema.virtual('trialDaysLeft').get(function() {
  if (!this.trialEndsAt) return 0
  const diff = this.trialEndsAt.getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
})

module.exports = mongoose.model('User', userSchema)
