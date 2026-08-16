// Markazlashgan JWT konfiguratsiyasi.
// JWT_SECRET MAJBURIY. Agar yo'q yoki juda qisqa bo'lsa, server ishga tushmaydi
// (fail-closed) — bu public default kalit bilan token soxtalashtirishning oldini oladi.
const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d'

if (!JWT_SECRET || JWT_SECRET.length < 16) {
  console.error(
    '\n❌ FATAL: JWT_SECRET environment o\'zgaruvchisi yo\'q yoki juda qisqa (kamida 16 belgi bo\'lishi shart).\n' +
    '   .env faylida kuchli, tasodifiy JWT_SECRET o\'rnating. Server to\'xtatildi.\n'
  )
  process.exit(1)
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET)
}

module.exports = { JWT_SECRET, JWT_EXPIRES_IN, signToken, verifyToken }
