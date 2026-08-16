const mongoose = require('mongoose')

// Navbat (sartaroshxona bandlovi)
const bookingSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // salon egasi
  barberId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  barberName: { type: String, default: '' },
  branchName: { type: String, default: '' },

  customerName: { type: String, required: [true, 'Ism majburiy'], trim: true },
  customerPhone: { type: String, required: [true, 'Telefon majburiy'], trim: true },

  service: { type: String, required: true }, // soch turi: "Klassik", "Fade"...
  servicePrice: { type: Number, default: 0 },
  durationMin: { type: Number, default: 30 },

  date: { type: String, required: true }, // "2026-08-16" (kun)
  timeSlot: { type: String, required: true }, // "14:00"

  status: {
    type: String,
    enum: ['booked', 'arrived', 'done', 'no_show', 'cancelled'],
    default: 'booked',
    index: true,
  },
  // Zalog (deposit) — navbatni kafolatlash uchun
  deposit: { type: Number, default: 0 },
  depositPaid: { type: Boolean, default: false },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'click', 'payme', 'none'],
    default: 'none',
  },
  queueNumber: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  isVoiceAdded: { type: Boolean, default: false },
  isWalkIn: { type: Boolean, default: false }, // do'konga to'g'ridan-to'g'ri kelgan (bron emas)
  delayedMin: { type: Number, default: 0 },
  // Haqiqiy vaqt o'lchovlari — aniq kutish vaqti va analitika uchun
  arrivedAt: { type: Date },
  doneAt: { type: Date },
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

bookingSchema.index({ barberId: 1, date: 1, timeSlot: 1 })
bookingSchema.index({ ownerId: 1, date: 1 })
bookingSchema.index({ customerPhone: 1, createdAt: -1 })

module.exports = mongoose.model('Booking', bookingSchema)
