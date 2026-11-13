const express = require('express')
const path = require('path')
const cors = require('cors')
const dotenv = require('dotenv')
const cron = require('node-cron')
const { connectDB, isConnected, usingMemoryServer } = require('./src/config/db')

// Load env vars
dotenv.config()

const app = express()

// Render/Cloudflare/nginx ortida haqiqiy mijoz IP'si (rate limit uchun)
app.set('trust proxy', 1)

// CORS: faqat ruxsat etilgan manbalar. Qo'shimcha domenlar: CORS_ORIGINS=https://a.uz,https://b.uz
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'
const IS_PROD = process.env.NODE_ENV === 'production'
const allowedOrigins = new Set([
  FRONTEND_URL,
  FRONTEND_URL.replace('://', '://www.'),
  ...(process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
])
const isLocalOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
app.use(cors({
  origin: (origin, cb) => {
    // origin yo'q = server-server (Telegram bot, curl) — cookie ishlatilmaydi, xavfsiz
    if (!origin || allowedOrigins.has(origin) || (!IS_PROD && isLocalOrigin(origin))) {
      return cb(null, true)
    }
    return cb(null, false)
  },
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

// Basic security headers (helmet o'rniga, tashqi paketsiz)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff') // /uploads MIME-sniffing (SVG/HTML XSS) oldini oladi
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('X-DNS-Prefetch-Control', 'off')
  next()
})

// Request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} ${req.path}`)
  next()
})

// API Status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'OK',
    service: 'OsonBiznes API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: isConnected() ? 'connected' : 'disconnected',
  })
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'OsonBiznes API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: isConnected() ? 'connected' : 'disconnected',
  })
})

// API Routes
app.use('/api/auth', require('./src/routes/auth'))
app.use('/api/products', require('./src/routes/products'))
app.use('/api/orders', require('./src/routes/orders'))
app.use('/api/customers', require('./src/routes/customers'))
app.use('/api/invoices', require('./src/routes/invoices'))
app.use('/api/telegram', require('./src/routes/telegram'))
app.use('/api/subscription', require('./src/routes/subscription'))
app.use('/api/admin', require('./src/routes/admin'))
app.use('/api/notifications', require('./src/routes/notifications'))
app.use('/api/support', require('./src/routes/support'))
app.use('/api/marketplace', require('./src/routes/marketplace'))
app.use('/api/upload', require('./src/routes/upload'))
app.use('/api/ai', require('./src/routes/ai'))

// Serve uploaded files
// Demo katalog rasmlari (repo'da saqlanadi; uploads/ esa gitignore)
app.use('/uploads/demo', express.static(path.join(__dirname, 'demo-assets'), { maxAge: '7d' }))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Error handler
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: "So'rov formati noto'g'ri (JSON)" })
  }
  if (err.name === 'CastError') {
    return res.status(404).json({ success: false, message: 'Topilmadi' })
  }
  console.error('Xatolik:', err)
  res.status(500).json({
    success: false,
    message: 'Serverda xatolik yuz berdi',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "So'rov topilmadi",
  })
})

const PORT = process.env.PORT || 5000

// Start HTTP server FIRST, then connect MongoDB in background
app.listen(PORT, () => {
  console.log(`
====================================
  OsonBiznes API v2.0
  Server: http://localhost:${PORT}
  Status: http://localhost:${PORT}/api/status
====================================
  `)

  // Connect to MongoDB in background (non-blocking)
  connectDB().then(() => {
    if (isConnected()) {
      console.log('  Database: MongoDB connected')
      // Create indexes
      require('./src/config/indexes').createIndexes()
        .catch(err => console.log('  Indexes skip:', err.message))
    }
  }).catch(err => {
    console.error('  Database: MongoDB unavailable (' + err.message + ')')
    // Productionda bazasiz ishlash = jim ma'lumot yo'qotish. Render qayta ishga tushiradi.
    if (IS_PROD) process.exit(1)
  })
})

// ========== CRON JOBS ==========

// Bildirishnomani kuniga ko'pi bilan bir marta yuborish (cron qayta ishlasa ham spam bo'lmaydi)
async function notifyOnce(userId, type, title, message, windowHours = 20) {
  const Notification = require('./src/models/Notification')
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000)
  if (await Notification.exists({ userId, type, createdAt: { $gte: since } })) return false
  await Notification.send({ userId, type, title, message, urgent: true })
  return true
}

// Har kuni soat 09:00: trial tugashiga 3 kun qolganlarga eslatma
cron.schedule('0 9 * * *', async () => {
  if (!isConnected()) return
  try {
    const User = require('./src/models/User')
    const expiringSoon = await User.find({
      role: 'shop_owner',
      tariff: 'trial',
      trialEndsAt: { $gte: new Date(), $lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
    }).select('_id trialEndsAt')
    let sent = 0
    for (const u of expiringSoon) {
      const days = Math.max(1, Math.ceil((u.trialEndsAt - Date.now()) / 86400000))
      if (await notifyOnce(u._id, 'trial_expiring', 'Bepul sinov tugayapti ⏳',
        `Sinov muddatingiz ${days} kundan keyin tugaydi. Ma'lumotlaringiz saqlanib qolishi uchun "Obuna" bo'limidan tarif tanlang.`)) sent++
    }
    console.log(`Trial reminders sent: ${sent}`)
  } catch (err) {
    console.error('Trial check:', err.message)
  }
})

// Har kuni soat 00:00: muddati o'tganlarga xabar (kirish bloklanmaydi — faqat yangi yozuv qo'shish to'xtaydi)
cron.schedule('0 0 * * *', async () => {
  if (!isConnected()) return
  try {
    const User = require('./src/models/User')
    const now = new Date()
    const expired = await User.find({
      role: 'shop_owner',
      $or: [
        { tariff: 'trial', trialEndsAt: { $lt: now } },
        { tariff: { $in: ['start', 'pro', 'business'] }, subscriptionEnd: { $lt: now } },
      ],
    }).select('_id tariff')
    let sent = 0
    for (const u of expired) {
      if (await notifyOnce(u._id, 'subscription_expired', "Obuna muddati tugadi",
        "Yangi mahsulot, buyurtma va mijoz qo'shish to'xtatildi. Davom ettirish uchun \"Obuna\" bo'limidan to'lov qiling.", 7 * 24)) sent++
    }
    console.log(`Expiration notices sent: ${sent}`)
  } catch (err) {
    console.error('Expiration check:', err.message)
  }
})

// Har kuni 00:30: muddati o'tgan hisob-fakturalarni 'overdue' ga o'tkazish
cron.schedule('30 0 * * *', async () => {
  if (!isConnected()) return
  try {
    const Invoice = require('./src/models/Invoice')
    const r = await Invoice.updateMany(
      { status: 'pending', isActive: true, dueDate: { $lt: new Date() } },
      { $set: { status: 'overdue' } }
    )
    console.log(`Overdue invoices updated: ${r.modifiedCount}`)
  } catch (err) {
    console.error('Overdue cron:', err.message)
  }
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Server stopping...')
  try {
    const { disconnectDB } = require('./src/config/db')
    await disconnectDB()
  } catch (_) {}
  process.exit(0)
})
process.on('SIGTERM', async () => {
  console.log('Server stopping...')
  try {
    const { disconnectDB } = require('./src/config/db')
    await disconnectDB()
  } catch (_) {}
  process.exit(0)
})
