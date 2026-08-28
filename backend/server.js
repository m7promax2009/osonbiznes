const express = require('express')
const path = require('path')
const cors = require('cors')
const dotenv = require('dotenv')
const cron = require('node-cron')
const { connectDB, isConnected, usingMemoryServer } = require('./src/config/db')

// Load env vars
dotenv.config()

const app = express()

// Middleware
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'
// www va www'siz variantni ham qabul qilamiz (nginx ikkalasiga xizmat qiladi)
const allowedOrigins = new Set([FRONTEND_URL, FRONTEND_URL.replace('://', '://www.')])
app.use(cors({
  origin: (origin, cb) => {
    // origin yo'q (mobil ilova, curl, Telegram bot) — ruxsat
    if (!origin || allowedOrigins.has(origin)) return cb(null, true)
    return cb(new Error('CORS: ruxsat berilmagan origin'))
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
app.use('/api/cards', require('./src/routes/cards'))
app.use('/api/marketplace', require('./src/routes/marketplace'))
app.use('/api/upload', require('./src/routes/upload'))
app.use('/api/ai', require('./src/routes/ai'))

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Error handler
app.use((err, req, res, next) => {
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
    console.log('  Database: MongoDB unavailable (' + err.message + ')')
  })
})

// ========== CRON JOBS ==========

// Har kuni soat 09:00: Trial tugashiga eslatma
cron.schedule('0 9 * * *', async () => {
  if (!isConnected()) return
  console.log('Trial expirations check...')
  try {
    const User = require('./src/models/User')
    const expiringSoon = await User.find({
      role: 'shop_owner',
      tariff: 'trial',
      trialEndsAt: { $gte: new Date(), $lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
    })
    console.log(`${expiringSoon.length} users trial ending in 3 days`)
  } catch (err) {
    console.error('Trial check:', err.message)
  }
})

// Har kuni soat 00:00: Mudati otganlar
cron.schedule('0 0 * * *', async () => {
  if (!isConnected()) return
  console.log('Expired subscriptions check...')
  try {
    const User = require('./src/models/User')
    const expired = await User.find({
      role: 'shop_owner',
      tariff: { $in: ['trial', 'start', 'pro', 'business'] },
    })
    for (const user of expired) {
      const status = user.tariffStatus
      if (status === 'trial_expired') console.log(`User ${user.email}: trial expired`)
      else if (status === 'subscription_expired') console.log(`User ${user.email}: subscription expired`)
    }
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
