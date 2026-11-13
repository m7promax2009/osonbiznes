const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({
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
  orderNumber: {
    type: String,
    // Global unique EMAS — raqam har do'kon ichida ketma-ket (ORD-00001).
    // Turli do'konlar bir xil raqamga ega bo'lishi mumkin (compound index pastda).
  },
  customer: {
    type: String,
    required: [true, 'Mijoz ismi majburiy'],
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    name: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, default: '' },
  }],
  subtotal: {
    type: Number,
    default: 0,
  },
  discount: {
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
    enum: ['pending', 'processing', 'completed', 'cancelled'],
    default: 'pending',
  },
  payment: {
    type: String,
    enum: ['unpaid', 'paid', 'refunded', 'partially_paid'],
    default: 'unpaid',
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'click', 'payme', 'card', 'transfer', 'nasiya', ''],
    default: '',
  },
  source: {
    type: String,
    enum: ['manual', 'telegram', 'website', 'pos'],
    default: 'manual',
  },
  notes: {
    type: String,
    trim: true,
    default: '',
  },
  address: {
    type: String,
    trim: true,
    default: '',
  },
  // Mijoz xaritada belgilagan nuqta (yetkazish uchun) — kuryer aynan shu joyga boradi
  location: {
    lat: { type: Number },
    lng: { type: Number },
  },
  deliveryMethod: {
    type: String,
    enum: ['pickup', 'delivery', ''],
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
})

// Buyurtmani ketma-ket raqam bilan yaratish (collision'ga chidamli).
// Bir vaqtda kelgan yoki turli do'kon so'rovlarida raqam to'qnashsa (E11000),
// keyingi raqam bilan qayta urinadi.
orderSchema.statics.createOrder = async function (data) {
  const base = await this.countDocuments({ userId: data.userId })
  for (let attempt = 0; attempt < 6; attempt++) {
    const orderNumber = `ORD-${String(base + 1 + attempt).padStart(5, '0')}`
    try {
      return await this.create({ ...data, orderNumber })
    } catch (err) {
      if (err.code === 11000 && attempt < 5) continue
      throw err
    }
  }
}

// Indekslar
orderSchema.index({ userId: 1, status: 1 })
orderSchema.index({ userId: 1, createdAt: -1 })
// Raqam faqat bitta do'kon ichida unique (turli do'konlarda takrorlanishi mumkin)
orderSchema.index({ userId: 1, orderNumber: 1 }, { unique: true })

module.exports = mongoose.model('Order', orderSchema)
