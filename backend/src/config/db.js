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
    await ensureWorkshopDemo()
    await ensureBarbershopDemo()
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
    business: 'Aziz Avto Detal',
    phone: '+998 90 123 45 67',
    description: 'Original avto ehtiyot qismlar va aksessuarlar',
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
    business: 'Bobur Avto Zapchast',
    phone: '+998 91 234 56 78',
    description: 'Dvigatel va elektr qismlari, tez yetkazib berish',
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
    description: 'Original avto ehtiyot qismlar: tormoz, filtr, moy. Kafolat bilan.',
    address: 'Chilonzor tumani, Avto bozor, 12-do\'kon',
    city: 'Toshkent',
    latitude: 41.2856, longitude: 69.2034,
    showOnMarketplace: true, isFeatured: true, isVerified: true,
    categories: ['Tormoz tizimi', 'Filtrlar', 'Moy va suyuqliklar', 'Akkumulyator'],
    rating: 4.9,
    productCount: 5,
  })
  await ShopProfile.create({
    userId: demoUser2._id,
    description: 'Dvigatel va elektr qismlari, xodovoy. Tez yetkazib berish.',
    address: 'Yunusobod tumani, Sergeli avto zapchast bozori',
    city: 'Toshkent',
    latitude: 41.3640, longitude: 69.2894,
    showOnMarketplace: true, isFeatured: true, isVerified: true,
    categories: ['Dvigatel qismlari', 'Xodovoy', 'Elektrika'],
    rating: 4.8,
    productCount: 5,
  })
  console.log('  ✅ Marketplace profiles created for demo shops')

  // Products - Shop 1 (Aziz Electronics)
  const products = await Product.insertMany([
    { userId: demoUser._id, name: 'Tormoz kolodka (old) Nexia 3', category: 'Tormoz tizimi', price: 180000, cost: 130000, stock: 24, sku: 'BRK-NX3-F' },
    { userId: demoUser._id, name: 'Moy filtri Cobalt/Gentra', category: 'Filtrlar', price: 45000, cost: 30000, stock: 60, sku: 'FLT-OIL-COB' },
    { userId: demoUser._id, name: 'Motor moyi Castrol 5W-40 (4L)', category: 'Moy va suyuqliklar', price: 280000, cost: 220000, stock: 3, sku: 'OIL-CAS-4L' },
    { userId: demoUser._id, name: 'Akkumulyator 60Ah', category: 'Akkumulyator', price: 750000, cost: 620000, stock: 0, sku: 'BAT-60AH' },
    { userId: demoUser._id, name: 'Havo filtri Malibu', category: 'Filtrlar', price: 95000, cost: 65000, stock: 18, sku: 'FLT-AIR-MLB' },
  ])
  console.log(`  ✅ Shop 1: ${products.length} products`)

  // Products - Shop 2 (Mobile Store)
  const products2 = await Product.insertMany([
    { userId: demoUser2._id, name: 'SHRUS granata Gentra', category: 'Dvigatel qismlari', price: 220000, cost: 160000, stock: 14, sku: 'ENG-SHR-GEN' },
    { userId: demoUser2._id, name: 'Svecha NGK (4 dona)', category: 'Dvigatel qismlari', price: 120000, cost: 85000, stock: 40, sku: 'ENG-NGK-4' },
    { userId: demoUser2._id, name: 'Radiator Lacetti', category: 'Dvigatel qismlari', price: 680000, cost: 520000, stock: 5, sku: 'ENG-RAD-LAC' },
    { userId: demoUser2._id, name: 'Amortizator (old) Spark', category: 'Xodovoy', price: 320000, cost: 240000, stock: 8, sku: 'SUS-AMO-SPK' },
    { userId: demoUser2._id, name: 'Old faralar Nexia 3', category: 'Elektrika', price: 450000, cost: 340000, stock: 6, sku: 'ELE-HL-NX3' },
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
    { userId: demoUser._id, orderNumber: 'ORD-00001', customer: 'Alisher Karimov', phone: '+998 90 123 45 67', items: [{ name: 'Tormoz kolodka (old) Nexia 3', qty: 2, price: 180000 }], subtotal: 360000, total: 360000, status: 'completed', payment: 'paid', paymentMethod: 'click', source: 'telegram' },
    { userId: demoUser._id, orderNumber: 'ORD-00002', customer: 'Dilshod Rahimov', phone: '+998 91 234 56 78', items: [{ name: 'Motor moyi Castrol 5W-40 (4L)', qty: 1, price: 280000 }, { name: 'Moy filtri Cobalt/Gentra', qty: 1, price: 45000 }], subtotal: 325000, total: 325000, status: 'pending', payment: 'unpaid', source: 'manual' },
    { userId: demoUser._id, orderNumber: 'ORD-00003', customer: 'Malika Umarova', phone: '+998 93 345 67 89', items: [{ name: 'Akkumulyator 60Ah', qty: 1, price: 750000 }], subtotal: 750000, total: 750000, status: 'processing', payment: 'paid', paymentMethod: 'payme', source: 'telegram' },
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

  // Demo to'lovlar (admin "To'lovlar" sahifasi bo'sh ko'rinmasligi uchun)
  await Payment.insertMany([
    { userId: demoUser._id, amount: 199000, method: 'click', type: 'subscription', tariff: 'pro', status: 'success', description: 'Pro tarifi uchun tolov' },
    { userId: demoUser2._id, amount: 99000, method: 'payme', type: 'subscription', tariff: 'start', status: 'success', description: 'Start tarifi uchun tolov' },
    { userId: demoUser._id, amount: 199000, method: 'click', type: 'subscription', tariff: 'pro', status: 'pending', description: 'Pro tarifi uchun tolov (kutilmoqda)' },
  ])
  console.log('  ✅ 3 demo payments')

  // Avto ustaxona demo
  await ensureWorkshopDemo()
  // ✂️ Sartaroshxona marketplace (hackathon asosiy oqimi)
  await ensureBarbershopDemo()

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
      ? 'Original avto ehtiyot qismlar: tormoz, filtr, moy. Kafolat bilan.'
      : 'Dvigatel va elektr qismlari, xodovoy. Tez yetkazib berish.'

    await ShopProfile.create({
      userId: user._id,
      description: desc,
      address: email === 'demo@osonbiznes.uz' ? 'Chilonzor tumani, Avto bozor, 12-do\'kon' : 'Yunusobod tumani, Sergeli avto zapchast bozori',
      city: 'Toshkent',
      latitude: email === 'demo@osonbiznes.uz' ? 41.2856 : 41.3640,
      longitude: email === 'demo@osonbiznes.uz' ? 69.2034 : 69.2894,
      showOnMarketplace: true, isFeatured: true, isVerified: true,
      categories: email === 'demo@osonbiznes.uz' ? ['Tormoz tizimi', 'Filtrlar', 'Moy va suyuqliklar'] : ['Dvigatel qismlari', 'Xodovoy', 'Elektrika'],
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
    business: 'Bobur Avto Zapchast',
    phone: '+998 91 234 56 78',
    description: 'Dvigatel va elektr qismlari, tez yetkazib berish',
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

// Avto ustaxona demo: ega + 2 usta + ish buyurtmalari (idempotent)
async function ensureWorkshopDemo() {
  const User = require('../models/User')
  const WorkOrder = require('../models/WorkOrder')

  const existing = await User.findOne({ email: 'usta@avto.uz' })
  if (existing) return

  console.log('  🔧 Avto ustaxona demo yaratilmoqda...')
  const owner = await User.create({
    name: 'Sardor Aka', email: 'usta@avto.uz', password: 'usta123',
    role: 'shop_owner', business: 'Avto Servis Pro', phone: '+998 90 111 22 33',
    tariff: 'business', subscriptionStart: new Date(), subscriptionEnd: new Date(Date.now() + 365 * 864e5), isActive: true,
  })
  const aziz = await User.create({ name: 'Aziz Usta', email: 'aziz@avto.uz', password: 'aziz123', role: 'master', ownerId: owner._id, specialty: 'Dvigatel', phone: '+998 90 222 33 44', tariff: 'business', isActive: true })
  const bek = await User.create({ name: 'Bek Usta', email: 'bek@avto.uz', password: 'bek123', role: 'master', ownerId: owner._id, specialty: 'Elektrik', phone: '+998 90 333 44 55', tariff: 'business', isActive: true })

  const now = Date.now()
  const orders = [
    { customerName: 'Jasur', customerPhone: '+998901234501', carModel: 'Chevrolet Nexia 3', carPlate: '01A123BC', services: [{ name: 'Tormoz kolodka almashtirish', price: 250000 }], parts: [{ name: 'Kolodka (old)', qty: 1, price: 180000 }], assignedMaster: aziz._id, masterName: aziz.name, status: 'in_progress', estimatedReady: new Date(now + 2 * 36e5) },
    { customerName: 'Dilshod', customerPhone: '+998901234502', carModel: 'Chevrolet Malibu', carPlate: '01B456CD', services: [{ name: 'Moy almashtirish', price: 120000 }], parts: [{ name: 'Moy filtri', qty: 1, price: 45000 }, { name: 'Motor moyi 4L', qty: 1, price: 280000 }], assignedMaster: bek._id, masterName: bek.name, status: 'ready', estimatedReady: new Date(now - 1 * 36e5) },
    { customerName: 'Oybek', customerPhone: '+998901234503', carModel: 'Chevrolet Cobalt', carPlate: '01C789EF', services: [{ name: 'Kompyuter diagnostika', price: 80000 }], parts: [], assignedMaster: aziz._id, masterName: aziz.name, status: 'new', estimatedReady: new Date(now + 4 * 36e5) },
    { customerName: 'Rustam', customerPhone: '+998901234504', carModel: 'Daewoo Gentra', carPlate: '01D012GH', services: [{ name: 'Konditsioner tozalash', price: 150000 }], parts: [], assignedMaster: bek._id, masterName: bek.name, status: 'in_progress', estimatedReady: new Date(now + 3 * 36e5) },
    { customerName: 'Sunnat', customerPhone: '+998901234505', carModel: 'Chevrolet Spark', carPlate: '01E345IJ', services: [{ name: 'Xodovoy remont', price: 400000 }], parts: [{ name: 'SHRUS', qty: 2, price: 220000 }], assignedMaster: aziz._id, masterName: aziz.name, status: 'delivered', payment: 'paid', estimatedReady: new Date(now - 5 * 36e5) },
    { customerName: 'Kamol', customerPhone: '+998901234506', carModel: 'Chevrolet Lacetti', carPlate: '01F678KL', services: [{ name: 'Dvigatel kapital remont', price: 2500000 }], parts: [], status: 'new', estimatedReady: new Date(now + 48 * 36e5) },
  ]
  let n = 0
  for (const o of orders) {
    o.userId = owner._id
    o.total = (o.services || []).reduce((s, x) => s + x.price, 0) + (o.parts || []).reduce((s, x) => s + x.price * x.qty, 0)
    await WorkOrder.createOrder(o)
    n++
  }
  console.log(`  ✅ Avto ustaxona: usta@avto.uz/usta123 (ega), aziz@avto.uz/aziz123, bek@avto.uz/bek123 (usta), ${n} ish buyurtmasi`)
}

// ✂️ Sartaroshxona marketplace demo (asosiy hackathon oqimi)
async function ensureBarbershopDemo() {
  const User = require('../models/User')
  const ShopProfile = require('../models/ShopProfile')
  const Product = require('../models/Product')
  const Booking = require('../models/Booking')

  const existing = await User.findOne({ email: 'barber@salon.uz' })
  if (existing) return

  console.log('  ✂️ Sartaroshxona demo yaratilmoqda...')
  const today = new Date().toISOString().slice(0, 10)

  // Xizmatlar (soch turlari) — har salonga qo'shiladi
  const SERVICES = [
    { name: 'Klassik soch olish', price: 40000, category: 'Xizmat' },
    { name: 'Fade (zamonaviy)', price: 60000, category: 'Xizmat' },
    { name: 'Soqol olish', price: 25000, category: 'Xizmat' },
    { name: 'Soch + Soqol', price: 70000, category: 'Xizmat' },
    { name: 'Bolalar sochi', price: 30000, category: 'Xizmat' },
    { name: 'Ukladka / styling', price: 50000, category: 'Xizmat' },
  ]

  async function makeSalon({ email, password, business, description, branches, rating, barbers }) {
    const owner = await User.create({
      name: business + ' egasi', email, password, role: 'shop_owner', business,
      phone: branches[0].phone, tariff: 'business', subscriptionStart: new Date(),
      subscriptionEnd: new Date(Date.now() + 365 * 864e5), isActive: true,
    })
    await ShopProfile.create({
      userId: owner._id, description, address: branches[0].address, city: 'Toshkent',
      latitude: branches[0].latitude, longitude: branches[0].longitude,
      rating, isVerified: true, showOnMarketplace: true, isFeatured: true,
      categories: ['Soch olish', 'Soqol', 'Styling'], branches,
    })
    await Product.insertMany(SERVICES.map(s => ({ ...s, userId: owner._id, stock: 999 })))
    const created = []
    for (const b of barbers) {
      const barber = await User.create({
        name: b.name, email: b.email, password: b.password, role: 'master', ownerId: owner._id,
        specialty: b.skills[0], skills: b.skills, rating: b.rating, reviewCount: b.reviews,
        avatar: b.avatar, priceFrom: b.priceFrom, branchName: b.branchName, bio: b.bio,
        phone: branches[0].phone, tariff: 'business', isActive: true,
      })
      created.push(barber)
    }
    return { owner, barbers: created }
  }

  // Salon 1 — Zamon Barbershop (2 filial), ega logini: barber@salon.uz / barber123
  const s1 = await makeSalon({
    email: 'barber@salon.uz', password: 'barber123', business: 'Zamon Barbershop',
    description: 'Zamonaviy fade va klassik soch olish. 2 filial, tajribali ustalar.',
    rating: 4.9,
    branches: [
      { name: 'Chilonzor filiali', address: 'Chilonzor, Bunyodkor 12', latitude: 41.2856, longitude: 69.2034, phone: '+998 90 111 22 33' },
      { name: 'Yunusobod filiali', address: 'Yunusobod, Amir Temur 108', latitude: 41.3640, longitude: 69.2894, phone: '+998 90 111 22 44' },
    ],
    barbers: [
      { name: 'Jasur', email: 'jasur@salon.uz', password: 'jasur123', skills: ['Fade', 'Andagunt', 'Soqol'], rating: 4.9, reviews: 210, avatar: '💈', priceFrom: 60000, branchName: 'Chilonzor filiali', bio: 'Fade bo\'yicha 6 yillik tajriba' },
      { name: 'Aziz', email: 'aziz2@salon.uz', password: 'aziz123', skills: ['Klassik', 'Soqol', 'Ukladka'], rating: 4.7, reviews: 140, avatar: '✂️', priceFrom: 40000, branchName: 'Chilonzor filiali', bio: 'Klassik uslub ustasi' },
      { name: 'Bek', email: 'bek2@salon.uz', password: 'bek123', skills: ['Bolalar sochi', 'Klassik'], rating: 4.8, reviews: 95, avatar: '🧔', priceFrom: 30000, branchName: 'Yunusobod filiali', bio: 'Bolalar bilan yaxshi ishlaydi' },
    ],
  })

  // Salon 2 — Elite Barber (1 filial)
  await makeSalon({
    email: 'elite@salon.uz', password: 'elite123', business: 'Elite Barber',
    description: 'Premium xizmat, styling va soqol parvarishi.',
    rating: 4.8,
    branches: [
      { name: 'Mirzo Ulug\'bek filiali', address: 'Mirzo Ulug\'bek, Mustaqillik 45', latitude: 41.3260, longitude: 69.3340, phone: '+998 90 222 33 44' },
    ],
    barbers: [
      { name: 'Sardor', email: 'sardor@salon.uz', password: 'sardor123', skills: ['Fade', 'Styling', 'Soqol'], rating: 4.9, reviews: 320, avatar: '💇', priceFrom: 70000, branchName: 'Mirzo Ulug\'bek filiali', bio: 'Premium styling mutaxassisi' },
      { name: 'Kamron', email: 'kamron@salon.uz', password: 'kamron123', skills: ['Klassik', 'Bolalar sochi'], rating: 4.6, reviews: 88, avatar: '✂️', priceFrom: 45000, branchName: 'Mirzo Ulug\'bek filiali', bio: '' },
    ],
  })

  // Marketplace faqat sartaroshxona bo'lsin — eski (auto/elektronika) profillarni yashiramiz
  const barberOwnerIds = [s1.owner._id]
  const allBarberOwners = await User.find({ business: { $in: ['Zamon Barbershop', 'Elite Barber'] } }).select('_id').lean()
  await ShopProfile.updateMany({ userId: { $nin: allBarberOwners.map(o => o._id) } }, { $set: { showOnMarketplace: false } })

  // Bugungi navbatlar (ega/sartarosh doskasi bo'sh bo'lmasligi uchun)
  const [jasur, aziz, bek] = s1.barbers
  const bookings = [
    { barber: jasur, cust: 'Anvar', phone: '+998901111101', service: 'Fade (zamonaviy)', price: 60000, slot: '10:00', status: 'done', depositPaid: true },
    { barber: jasur, cust: 'Sherzod', phone: '+998901111102', service: 'Soch + Soqol', price: 70000, slot: '11:00', status: 'arrived', depositPaid: true },
    { barber: jasur, cust: 'Doniyor', phone: '+998901111103', service: 'Fade (zamonaviy)', price: 60000, slot: '14:00', status: 'booked', depositPaid: false },
    { barber: aziz, cust: 'Bobur', phone: '+998901111104', service: 'Klassik soch olish', price: 40000, slot: '12:00', status: 'booked', depositPaid: true },
    { barber: aziz, cust: 'Kelmagan mijoz', phone: '+998901111105', service: 'Soqol olish', price: 25000, slot: '09:30', status: 'no_show', depositPaid: false },
    { barber: bek, cust: 'Otabek (o\'g\'li)', phone: '+998901111106', service: 'Bolalar sochi', price: 30000, slot: '15:00', status: 'booked', depositPaid: false },
  ]
  let n = 0
  for (const b of bookings) {
    n++
    await Booking.create({
      ownerId: s1.owner._id, barberId: b.barber._id, barberName: b.barber.name, branchName: b.barber.branchName,
      customerName: b.cust, customerPhone: b.phone, service: b.service, servicePrice: b.price, durationMin: 30,
      date: today, timeSlot: b.slot, status: b.status,
      deposit: Math.round(b.price * 0.15), depositPaid: b.depositPaid, queueNumber: n,
    })
  }

  // Salon sarf materiallari (Ombor)
  const INVENTORY = [
    { name: 'Professional Shampun (1L)', category: 'Kosmetika', price: 85000, cost: 60000, stock: 8, sku: 'SHMP-1L' },
    { name: 'Soch Voski / Pomada Matte', category: 'Styling', price: 65000, cost: 42000, stock: 12, sku: 'WAX-MAT' },
    { name: 'Bir martalik sochiqlar (100 dona)', category: 'Sarf materiali', price: 45000, cost: 30000, stock: 2, sku: 'TWL-100' }, // kam qoldi!
    { name: 'Derby Premium lezviyalar (100x)', category: 'Sarf materiali', price: 35000, cost: 22000, stock: 15, sku: 'BLD-DRB' },
    { name: 'Proraso Soqol kremi (Evkalipt)', category: 'Kosmetika', price: 75000, cost: 50000, stock: 6, sku: 'CRM-PRO' },
    { name: 'Antiseptik Spirtli Kolon (500ml)', category: 'Sarf materiali', price: 40000, cost: 25000, stock: 4, sku: 'CLN-500' }, // kam qoldi!
    { name: 'Taft Power Soch Spreyi', category: 'Styling', price: 55000, cost: 38000, stock: 9, sku: 'SPR-TAFT' },
  ]
  await Product.insertMany(INVENTORY.map(p => ({ ...p, userId: s1.owner._id })))

  console.log(`  ✅ Sartaroshxona: barber@salon.uz/barber123 (ega), 2 salon, 5 sartarosh, ${bookings.length} navbat, ${INVENTORY.length} ombor mahsuloti`)
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
