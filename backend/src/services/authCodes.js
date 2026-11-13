const crypto = require('crypto')
const AuthCode = require('../models/AuthCode')
const { JWT_SECRET } = require('../config/jwt')
const { sendMail } = require('./mailer')

const TTL_MS = 15 * 60 * 1000
const RESEND_COOLDOWN_MS = 60 * 1000
const MAX_ATTEMPTS = 5

const hashCode = (email, purpose, code) =>
  crypto.createHmac('sha256', JWT_SECRET).update(`${purpose}:${email}:${code}`).digest('hex')

class CooldownError extends Error {
  constructor(seconds) {
    super('cooldown')
    this.seconds = seconds
  }
}

const SUBJECTS = {
  verify_email: 'OsonBiznes: emailingizni tasdiqlang',
  reset_password: 'OsonBiznes: parolni tiklash kodi',
}
const BODIES = {
  verify_email: code => `Tasdiqlash kodingiz: ${code}\n\nKod 15 daqiqa amal qiladi. Agar siz ro'yxatdan o'tmagan bo'lsangiz, bu xatni e'tiborsiz qoldiring.`,
  reset_password: code => `Parolni tiklash kodingiz: ${code}\n\nKod 15 daqiqa amal qiladi. Kodni hech kimga bermang — OsonBiznes xodimlari uni hech qachon so'ramaydi.\nAgar siz so'ramagan bo'lsangiz, bu xatni e'tiborsiz qoldiring: parolingiz o'zgarmaydi.`,
}

// Yangi kod yaratib yuboradi. 60 soniyada bir martadan ko'p emas.
async function issueCode(email, purpose) {
  const existing = await AuthCode.findOne({ email, purpose }).lean()
  if (existing) {
    const since = Date.now() - new Date(existing.updatedAt).getTime()
    if (since < RESEND_COOLDOWN_MS) throw new CooldownError(Math.ceil((RESEND_COOLDOWN_MS - since) / 1000))
  }
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
  await AuthCode.findOneAndUpdate(
    { email, purpose },
    { codeHash: hashCode(email, purpose, code), attempts: 0, expiresAt: new Date(Date.now() + TTL_MS) },
    { upsert: true, setDefaultsOnInsert: true }
  )
  await sendMail({ to: email, subject: SUBJECTS[purpose], text: BODIES[purpose](code) })
}

// true — kod to'g'ri (va o'chiriladi). 5 ta xato urinishdan keyin kod bekor bo'ladi.
async function consumeCode(email, purpose, code) {
  const clean = String(code || '').replace(/\D/g, '')
  if (clean.length !== 6) return false
  const rec = await AuthCode.findOneAndUpdate(
    { email, purpose, expiresAt: { $gt: new Date() }, attempts: { $lt: MAX_ATTEMPTS } },
    { $inc: { attempts: 1 } },
    { new: true }
  )
  if (!rec) return false
  const a = Buffer.from(rec.codeHash, 'hex')
  const b = Buffer.from(hashCode(email, purpose, clean), 'hex')
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false
  await AuthCode.deleteOne({ _id: rec._id })
  return true
}

module.exports = { issueCode, consumeCode, CooldownError }
