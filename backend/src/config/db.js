const mongoose = require('mongoose')

let connected = false
let usingMemoryServer = false
let mongoServer = null

async function connectDB() {
  if (connected && mongoose.connection.readyState === 1) return

  // Try Atlas first
  const atlasUri = process.env.MONGODB_URI

  if (atlasUri && atlasUri !== 'mongodb://localhost:27017/osonbiznes') {
    try {
      console.log('🔌 Attempting MongoDB Atlas connection...')
      const conn = await mongoose.connect(atlasUri, {
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 30000,
        retryWrites: true,
        w: 'majority',
      })
      connected = true
      console.log(`✅ MongoDB Atlas connected: ${conn.connection.host}`)
      await seedDemoData()
      return conn
    } catch (err) {
      console.log(`⚠️ Atlas unavailable: ${err.message}`)
      console.log('🔄 Falling back to MongoDB Memory Server...')
    }
  }

  // Fallback to MongoDB Memory Server (no external server needed!)
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server')
    mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'osonbiznes',
      },
    })
    const uri = mongoServer.getUri()
    console.log(`📦 Memory Server URI: ${uri}`)

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 30000,
    })

    connected = true
    usingMemoryServer = true
    console.log('✅ MongoDB Memory Server connected!')
    console.log('ℹ️  All data is in-memory (lost on restart)')

    // Auto-seed demo data
    await seedDemoData()
    return mongoose.connection
  } catch (memErr) {
    console.error('❌ Memory Server also failed:', memErr.message)
    console.log('⚠️ Server will start WITHOUT database')
    return null
  }
}

async function seedDemoData() {
  const User = require('../models/User')
  const Product = require('../models/Product')
  const Customer = require('../models/Customer')
  const Order = require('../models/Order')
  const Payment = require('../models/Payment')
  const ShopProfile = require('../models/ShopProfile')

  // MUHIM: avval bazada user bor-yo'qligini tekshiramiz.
  // (Ilgari ensureBoburShop() birinchi ishlab, bitta user yaratardi va shu sabab
  //  quyidagi existingUsers>0 sharti admin/demo user yaratilishini bloklardi — bu bug edi.)
  const existingUsers = await User.countDocuments()
  if (existingUsers > 0) {
    // Baza allaqachon to'ldirilgan — faqat idempotent qismlarni ta'minlaymiz
    await ensureMarketplaceProfiles()
    await ensureBoburShop()
    return
  }

  console.log('🌱 Auto-seeding demo data...')

  // Admin
  const admin = await User.create({
    name: 'OsonBiznes Admin',
    email: 'admin@osonbiznes.uz',
    password: 'Admin123!',
    role: 'admin',
    business: 'OsonBiznes Platformasi',
    phone: '+998 90 000 00 00',
    tariff: 'business',
    subscriptionStart: new Date(),
    subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    isActive: true,
  })
  console.log(`  ✅ Admin: admin@osonbiznes.uz / Admin123!`)

  // Demo shop owner 1 - Aziz Electronics
  const demoUser = await User.create({
    name: 'Aziz Tadbirkor',
    email: 'demo@osonbiznes.uz',
    password: 'demo123',
    role: 'shop_owner',
    business: 'Aziz Electronics',
    phone: '+998 90 123 45 67',
    description: 'Eng sifatli elektronika va aksessuarlar',
    tariff: 'pro',
    subscriptionStart: new Date(),
    subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    autoPayment: true,
    paymentMethod: 'click',
    isActive: true,
  })
  console.log(`  ✅ Demo shop 1: demo@osonbiznes.uz / demo123`)

  // Demo shop owner 2 - Mobile Store
  const demoUser2 = await User.create({
    name: 'Bobur Akbarov',
    email: 'bobur@osonbiznes.uz',
    password: 'bobur123',
    role: 'shop_owner',
    business: 'Mobile Store',
    phone: '+998 91 234 56 78',
    description: 'Telefonlar, planshetlar va aksessuarlar',
    tariff: 'start',
    subscriptionStart: new Date(),
    subscriptionEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    autoPayment: true,
    paymentMethod: 'payme',
    isActive: true,
  })
  console.log(`  ✅ Demo shop 2: bobur@osonbiznes.uz / bobur123`)

  // Create ShopProfile for demo shops (so they show on OsonBozor)
  await ShopProfile.create({
    userId: demoUser._id,
    description: 'Eng sifatli elektronika va aksessuarlar. Rasmiylashtirilgan, kafolatli mahsulotlar.',
    address: 'Chilonzor tumani, 12-uy',
    city: 'Toshkent',
    showOnMarketplace: true,
    isFeatured: true,
    categories: ['Smartfonlar', 'Noutbuklar', 'Aksessuarlar'],
    rating: 4.9,
    productCount: 5,
  })
  await ShopProfile.create({
    userId: demoUser2._id,
    description: 'Telefonlar, planshetlar va aksessuarlar eng qulay narxlarda.',
    address: 'Yunusobod tumani, 5-mavze',
    city: 'Toshkent',
    showOnMarketplace: true,
    isFeatured: true,
    categories: ['Smartfonlar', 'Planshetlar', 'Aksessuarlar'],
    rating: 4.8,
    productCount: 5,
  })
  console.log('  ✅ Marketplace profiles created for demo shops')

  // Products - Shop 1 (Aziz Electronics)
  const products = await Product.insertMany([
    { userId: demoUser._id, name: 'iPhone 15 Pro 128GB', category: 'Smartfonlar', price: 12500000, cost: 10500000, stock: 15, sku: 'APL-IP15P-128' },
    { userId: demoUser._id, name: 'Samsung Galaxy A55', category: 'Smartfonlar', price: 5800000, cost: 4800000, stock: 8, sku: 'SAM-A55-256' },
    { userId: demoUser._id, name: 'Xiaomi Redmi Note 13', category: 'Smartfonlar', price: 3200000, cost: 2600000, stock: 3, sku: 'XIA-RN13-128' },
    { userId: demoUser._id, name: 'AirPods Pro 2', category: 'Aksessuarlar', price: 2800000, cost: 2200000, stock: 0, sku: 'APL-AIRP2' },
    { userId: demoUser._id, name: 'MacBook Air M3', category: 'Noutbuklar', price: 18500000, cost: 15800000, stock: 5, sku: 'APL-MBA-M3' },
  ])
  console.log(`  ✅ Shop 1: ${products.length} products`)

  // Products - Shop 2 (Mobile Store)
  const products2 = await Product.insertMany([
    { userId: demoUser2._id, name: 'Samsung Galaxy S24 Ultra', category: 'Smartfonlar', price: 15000000, cost: 13000000, stock: 10, sku: 'SAM-S24U-512' },
    { userId: demoUser2._id, name: 'iPad Pro M4 11"', category: 'Planshetlar', price: 16500000, cost: 14000000, stock: 5, sku: 'APL-IPPM4-11' },
    { userId: demoUser2._id, name: 'AirPods Max', category: 'Aksessuarlar', price: 4500000, cost: 3800000, stock: 7, sku: 'APL-APM-2' },
    { userId: demoUser2._id, name: 'Samsung Galaxy Watch 7', category: 'Aksessuarlar', price: 3200000, cost: 2600000, stock: 12, sku: 'SAM-GW7' },
    { userId: demoUser2._id, name: 'JBL Tune 770NC', category: 'Aksessuarlar', price: 1200000, cost: 900000, stock: 20, sku: 'JBL-770NC' },
  ])
  console.log(`  ✅ Shop 2: ${products2.length} products`)

  // Customers
  const customers = await Customer.insertMany([
    { userId: demoUser._id, name: 'Alisher Karimov', phone: '+998 90 123 45 67', email: 'alisher@mail.uz', totalOrders: 12, totalSpent: 45000000, rating: 5, city: 'Toshkent', tags: ['VIP', 'Doimiy'] },
    { userId: demoUser._id, name: 'Dilshod Rahimov', phone: '+998 91 234 56 78', email: 'dilshod@mail.uz', totalOrders: 8, totalSpent: 28000000, rating: 4, city: 'Samarqand', tags: ['Doimiy'] },
    { userId: demoUser._id, name: 'Malika Umarova', phone: '+998 93 345 67 89', email: 'malika@mail.uz', totalOrders: 15, totalSpent: 62000000, rating: 5, city: 'Toshkent', tags: ['VIP', 'Biznes'] },
  ])
  console.log(`  ✅ ${customers.length} customers`)

  // Orders
  const orders = await Order.insertMany([
    { userId: demoUser._id, orderNumber: 'ORD-00001', customer: 'Alisher Karimov', phone: '+998 90 123 45 67', items: [{ name: 'iPhone 15 Pro', qty: 1, price: 12500000 }], subtotal: 12500000, total: 12500000, status: 'completed', payment: 'paid', paymentMethod: 'click', source: 'telegram' },
    { userId: demoUser._id, orderNumber: 'ORD-00002', customer: 'Dilshod Rahimov', phone: '+998 91 234 56 78', items: [{ name: 'Samsung A55', qty: 1, price: 5800000 }, { name: 'AirPods Pro 2', qty: 1, price: 2800000 }], subtotal: 8600000, total: 8600000, status: 'pending', payment: 'unpaid', source: 'manual' },
    { userId: demoUser._id, orderNumber: 'ORD-00003', customer: 'Malika Umarova', phone: '+998 93 345 67 89', items: [{ name: 'MacBook Air M3', qty: 1, price: 18500000 }], subtotal: 18500000, total: 18500000, status: 'processing', payment: 'paid', paymentMethod: 'payme', source: 'telegram' },
  ])
  console.log(`  ✅ ${orders.length} orders`)

  // Update user stats
  await User.findByIdAndUpdate(demoUser._id, {
    totalProducts: products.length,
    totalOrders: orders.length,
    totalCustomers: customers.length,
    totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
  })
  await User.findByIdAndUpdate(demoUser2._id, {
    totalProducts: products2.length,
    totalOrders: 0,
    totalCustomers: 0,
    totalRevenue: 0,
  })

  console.log('🎉 Demo data seeded successfully!')
  console.log('')

  // === ALWAYS ensure marketplace profiles exist ===
  await ensureMarketplaceProfiles()

  console.log('📋 Login credentials:')
  console.log('   Admin: admin@osonbiznes.uz / Admin123!')
  console.log('   Shop:  demo@osonbiznes.uz / demo123')
}

async function ensureMarketplaceProfiles() {
  const ShopProfile = require('../models/ShopProfile')
  const User = require('../models/User')

  for (const email of ['demo@osonbiznes.uz', 'bobur@osonbiznes.uz']) {
    const existingProfile = await ShopProfile.findOne({}).populate({
      path: 'userId',
      match: { email },
    }).then(() => null).catch(() => null)

    // Find user directly
    const user = await User.findOne({ email })
    if (!user) continue

    const profileExists = await ShopProfile.findOne({ userId: user._id })
    if (profileExists) {
      // Ensure marketplace is ON
      if (!profileExists.showOnMarketplace) {
        profileExists.showOnMarketplace = true
        await profileExists.save()
        console.log(`  ✅ Marketplace enabled for ${email}`)
      }
      continue
    }

    const desc = email === 'demo@osonbiznes.uz'
      ? 'Eng sifatli elektronika va aksessuarlar. Rasmiylashtirilgan, kafolatli mahsulotlar.'
      : 'Telefonlar, planshetlar va aksessuarlar eng qulay narxlarda.'

    await ShopProfile.create({
      userId: user._id,
      description: desc,
      address: email === 'demo@osonbiznes.uz' ? 'Chilonzor tumani, 12-uy' : 'Yunusobod tumani, 5-mavze',
      city: 'Toshkent',
      showOnMarketplace: true,
      isFeatured: true,
      categories: ['Smartfonlar', 'Aksessuarlar'],
      rating: 4.9,
      productCount: await Product.countDocuments({ userId: user._id, isActive: { $ne: false } }),
    })
    console.log(`  ✅ Marketplace profile created for ${email}`)
  }
}

async function ensureBoburShop() {
  const User = require('../models/User')
  const Product = require('../models/Product')

  const existingBobur = await User.findOne({ email: 'bobur@osonbiznes.uz' })
  if (existingBobur) {
    console.log('  ℹ️ Bobur shop already exists, skipping...')
    return
  }

  console.log('  🌱 Creating Bobur Mobile Store (was missing)...')

  const bobur = await User.create({
    name: 'Bobur Akbarov',
    email: 'bobur@osonbiznes.uz',
    password: 'bobur123',
    role: 'shop_owner',
    business: 'Mobile Store',
    phone: '+998 91 234 56 78',
    description: 'Telefonlar, planshetlar va aksessuarlar',
    tariff: 'start',
    subscriptionStart: new Date(),
    subscriptionEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    autoPayment: true,
    paymentMethod: 'payme',
    isActive: true,
  })

  const products2 = await Product.insertMany([
    { userId: bobur._id, name: 'Samsung Galaxy S24 Ultra', category: 'Smartfonlar', price: 15000000, cost: 13000000, stock: 10, sku: 'SAM-S24U-512' },
    { userId: bobur._id, name: 'iPad Pro M4 11"', category: 'Planshetlar', price: 16500000, cost: 14000000, stock: 5, sku: 'APL-IPPM4-11' },
    { userId: bobur._id, name: 'AirPods Max', category: 'Aksessuarlar', price: 4500000, cost: 3800000, stock: 7, sku: 'APL-APM-2' },
    { userId: bobur._id, name: 'Samsung Galaxy Watch 7', category: 'Aksessuarlar', price: 3200000, cost: 2600000, stock: 12, sku: 'SAM-GW7' },
    { userId: bobur._id, name: 'JBL Tune 770NC', category: 'Aksessuarlar', price: 1200000, cost: 900000, stock: 20, sku: 'JBL-770NC' },
  ])

  await User.findByIdAndUpdate(bobur._id, {
    totalProducts: products2.length,
    totalOrders: 0,
    totalCustomers: 0,
    totalRevenue: 0,
  })

  console.log(`  ✅ Bobur Mobile Store created with ${products2.length} products`)
}

function isConnected() {
  return mongoose.connection?.readyState === 1
}

async function disconnectDB() {
  if (mongoServer) {
    await mongoose.disconnect()
    await mongoServer.stop()
    console.log('🛑 MongoDB Memory Server stopped')
  }
}

module.exports = { connectDB, isConnected, disconnectDB, usingMemoryServer }
