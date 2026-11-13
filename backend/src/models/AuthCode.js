const mongoose = require('mongoose')

// Bir martalik tasdiqlash kodlari (email tasdiqlash, parolni tiklash). Kodning o'zi saqlanmaydi — faqat HMAC.
const authCodeSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    purpose: { type: String, enum: ['verify_email', 'reset_password'], required: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
)

authCodeSchema.index({ email: 1, purpose: 1 }, { unique: true })
authCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }) // muddati o'tgani avtomatik o'chadi

module.exports = mongoose.model('AuthCode', authCodeSchema)
