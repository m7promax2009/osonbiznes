const mongoose = require('mongoose')

// Ish buyurtmasi (avto ustaxona) — bitta mashina ta'miri
const workOrderSchema = new mongoose.Schema({
  // Ustaxona egasi (workshop)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  orderNumber: { type: String }, // IB-00001 (ega ichida ketma-ket)

  // Mijoz
  customerName: { type: String, required: [true, 'Mijoz ismi majburiy'], trim: true },
  customerPhone: { type: String, trim: true, default: '' },

  // Mashina
  carModel: { type: String, required: [true, 'Mashina modeli majburiy'], trim: true }, // "Nexia 3"
  carPlate: { type: String, trim: true, default: '', uppercase: true }, // "01A123BC"

  // Xizmatlar (ishlar) va ehtiyot qismlar (ombor)
  services: [{
    name: { type: String, required: true }, // "Moy almashtirish"
    price: { type: Number, required: true, min: 0 },
  }],
  parts: [{
    name: { type: String, required: true }, // "Moy filtri"
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  }],

  // Biriktirilgan usta
  assignedMaster: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  masterName: { type: String, default: '' }, // tez ko'rsatish uchun nusxa

  // Holat: qabul → ishlanmoqda → tayyor → topshirildi (yoki bekor)
  status: {
    type: String,
    enum: ['new', 'in_progress', 'ready', 'delivered', 'cancelled'],
    default: 'new',
    index: true,
  },
  cancelReason: { type: String, default: '' }, // bekor sababi (mijoz kelmadi, ...)

  estimatedReady: { type: Date, default: null }, // taxminan qachon tayyor
  total: { type: Number, default: 0, min: 0 },
  payment: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
  notes: { type: String, trim: true, default: '' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

// Jami summani xizmat + qism narxidan hisoblash
workOrderSchema.methods.computeTotal = function () {
  const s = (this.services || []).reduce((sum, x) => sum + (x.price || 0), 0)
  const p = (this.parts || []).reduce((sum, x) => sum + (x.price || 0) * (x.qty || 1), 0)
  return s + p
}

// Ketma-ket raqam bilan yaratish (collision'ga chidamli)
workOrderSchema.statics.createOrder = async function (data) {
  const base = await this.countDocuments({ userId: data.userId })
  for (let attempt = 0; attempt < 6; attempt++) {
    const orderNumber = `IB-${String(base + 1 + attempt).padStart(5, '0')}`
    try {
      return await this.create({ ...data, orderNumber })
    } catch (err) {
      if (err.code === 11000 && attempt < 5) continue
      throw err
    }
  }
}

workOrderSchema.index({ userId: 1, status: 1 })
workOrderSchema.index({ userId: 1, createdAt: -1 })
workOrderSchema.index({ userId: 1, orderNumber: 1 }, { unique: true })
workOrderSchema.index({ carPlate: 1 })

module.exports = mongoose.model('WorkOrder', workOrderSchema)
