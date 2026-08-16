require('dotenv').config()
const mongoose = require('mongoose')
const User = require('./models/User')
const Product = require('./models/Product')
const Customer = require('./models/Customer')
const Order = require('./models/Order')
const Payment = require('./models/Payment')
const { connectDB } = require('./config/db')

async function seed() {
  console.log('🌱 Seeding database...\n')

  await connectDB()

  // === ADMIN ===
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@osonbiznes.uz'
  let admin = await User.findOne({ email: adminEmail })

  if (!admin) {
    admin = await User.create({
      name: process.env.ADMIN_NAME || 'OsonBiznes Admin',
      email: adminEmail,
      password: process.env.ADMIN_PASSWORD || 'Admin123!',
      role: 'admin',
      business: 'OsonBiznes Platformasi',
      phone: '+998 90 000 00 00',
      tariff: 'business',
      subscriptionStart: new Date(),
      subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isActive: true,
    })
    console.log(`✅ Admin created:
   Email: ${admin.email}
   Password: ${process.env.ADMIN_PASSWORD || 'Admin123!'}
   Role: ${admin.role}
    `)
  } else {
    console.log(`✅ Admin already exists:
   Email: ${admin.email}
   Password: ${process.env.ADMIN_PASSWORD || 'Admin123!'}
    `)
  }

  // === DEMO SHOP OWNER ===
  let demoUser = await User.findOne({ email: 'demo@osonbiznes.uz' })

  if (!demoUser) {
    demoUser = await User.create({
      name: 'Aziz Tadbirkor',
      email: 'demo@osonbiznes.uz',
      password: 'demo123',
      role: 'shop_owner',
      business: 'Aziz Electronics',
      phone: '+998 90 123 45 67',
      tariff: 'pro',
      subscriptionStart: new Date(),
      subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      autoPayment: true,
      paymentMethod: 'click',
      isActive: true,
    })
    console.log(`✅ Demo shop owner created:
   Email: ${demoUser.email}
   Password: demo123
   Business: ${demoUser.business}
   Tariff: ${demoUser.tariff}
    `)
  } else {
    console.log(`✅ Demo shop owner exists:
   Email: ${demoUser.email}
   Password: demo123
    `)
  }

  // === PRODUCTS ===
  const existingProducts = await Product.countDocuments({ userId: demoUser._id })
  if (existingProducts === 0) {
    const products = await Product.insertMany([
      { userId: demoUser._id, name: 'iPhone 15 Pro 128GB', category: 'Smartfonlar', price: 12500000, cost: 10500000, stock: 15, sku: 'APL-IP15P-128' },
      { userId: demoUser._id, name: 'Samsung Galaxy A55', category: 'Smartfonlar', price: 5800000, cost: 4800000, stock: 8, sku: 'SAM-A55-256' },
      { userId: demoUser._id, name: 'Xiaomi Redmi Note 13', category: 'Smartfonlar', price: 3200000, cost: 2600000, stock: 3, sku: 'XIA-RN13-128' },
      { userId: demoUser._id, name: 'AirPods Pro 2', category: 'Aksessuarlar', price: 2800000, cost: 2200000, stock: 0, sku: 'APL-AIRP2' },
      { userId: demoUser._id, name: 'MacBook Air M3', category: 'Noutbuklar', price: 18500000, cost: 15800000, stock: 5, sku: 'APL-MBA-M3' },
    ])
    console.log(`✅ ${products.length} demo products created`)
  } else {
    console.log(`✅ ${existingProducts} products already exist`)
  }

  // === CUSTOMERS ===
  const existingCustomers = await Customer.countDocuments({ userId: demoUser._id })
  if (existingCustomers === 0) {
    const customers = await Customer.insertMany([
      { userId: demoUser._id, name: 'Alisher Karimov', phone: '+998 90 123 45 67', email: 'alisher@mail.uz', totalOrders: 12, totalSpent: 45000000, rating: 5, city: 'Toshkent', tags: ['VIP', 'Doimiy'] },
      { userId: demoUser._id, name: 'Dilshod Rahimov', phone: '+998 91 234 56 78', email: 'dilshod@mail.uz', totalOrders: 8, totalSpent: 28000000, rating: 4, city: 'Samarqand', tags: ['Doimiy'] },
      { userId: demoUser._id, name: 'Malika Umarova', phone: '+998 93 345 67 89', email: 'malika@mail.uz', totalOrders: 15, totalSpent: 62000000, rating: 5, city: 'Toshkent', tags: ['VIP', 'Biznes'] },
      { userId: demoUser._id, name: 'Jasur Toshmatov', phone: '+998 94 456 78 90', email: 'jasur@mail.uz', totalOrders: 3, totalSpent: 9500000, rating: 3, city: "Farg'ona", tags: ['Yangi'] },
      { userId: demoUser._id, name: 'Rustam Bekmurodov', phone: '+998 97 678 90 12', email: 'rustam@mail.uz', totalOrders: 20, totalSpent: 85000000, rating: 5, city: 'Buxoro', tags: ['VIP', 'Biznes', 'Doimiy'] },
    ])
    console.log(`✅ ${customers.length} demo customers created`)
  } else {
    console.log(`✅ ${existingCustomers} customers already exist`)
  }

  // === ORDERS ===
  const existingOrders = await Order.countDocuments({ userId: demoUser._id })
  if (existingOrders === 0) {
    const orders = await Order.insertMany([
      { userId: demoUser._id, orderNumber: 'ORD-00001', customer: 'Alisher Karimov', phone: '+998 90 123 45 67', items: [{ name: 'iPhone 15 Pro', qty: 1, price: 12500000 }], subtotal: 12500000, total: 12500000, status: 'completed', payment: 'paid', paymentMethod: 'click', source: 'telegram' },
      { userId: demoUser._id, orderNumber: 'ORD-00002', customer: 'Dilshod Rahimov', phone: '+998 91 234 56 78', items: [{ name: 'Samsung A55', qty: 1, price: 5800000 }, { name: 'AirPods Pro 2', qty: 1, price: 2800000 }], subtotal: 8600000, total: 8600000, status: 'pending', payment: 'unpaid', source: 'manual' },
      { userId: demoUser._id, orderNumber: 'ORD-00003', customer: 'Malika Umarova', phone: '+998 93 345 67 89', items: [{ name: 'MacBook Air M3', qty: 1, price: 18500000 }], subtotal: 18500000, total: 18500000, status: 'processing', payment: 'paid', paymentMethod: 'payme', source: 'telegram' },
    ])
    console.log(`✅ ${orders.length} demo orders created`)
  } else {
    console.log(`✅ ${existingOrders} orders already exist`)
  }

  // === PAYMENTS ===
  const existingPayments = await Payment.countDocuments({ userId: demoUser._id })
  if (existingPayments === 0) {
    await Payment.insertMany([
      { userId: demoUser._id, amount: 199000, method: 'click', type: 'subscription', tariff: 'pro', status: 'success', description: 'Pro tarifi uchun tolov (1 oy)' },
      { userId: demoUser._id, amount: 199000, method: 'payme', type: 'subscription', tariff: 'pro', status: 'success', description: 'Pro tarifi uchun tolov (2-oy)' },
    ])
    console.log('✅ 2 demo payments created')
  } else {
    console.log(`✅ ${existingPayments} payments already exist`)
  }

  // Update user stats
  await User.findByIdAndUpdate(demoUser._id, {
    totalProducts: await Product.countDocuments({ userId: demoUser._id }),
    totalOrders: await Order.countDocuments({ userId: demoUser._id }),
    totalCustomers: await Customer.countDocuments({ userId: demoUser._id }),
    totalRevenue: (await Order.aggregate([{ $match: { userId: demoUser._id } }, { $group: { _id: null, total: { $sum: '$total' } } }]))[0]?.total || 0,
  })

  console.log('\n🎉 Seeding complete!\n')
  console.log('📋 Login ma\'lumotlari:')
  console.log('━'.repeat(40))
  console.log('👑 ADMIN:')
  console.log(`   Email:    ${process.env.ADMIN_EMAIL || 'admin@osonbiznes.uz'}`)
  console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'Admin123!'}`)
  console.log('')
  console.log('🏪 SHOP OWNER (demo):')
  console.log(`   Email:    demo@osonbiznes.uz`)
  console.log(`   Password: demo123`)
  console.log('')
  console.log('🌐 Frontend: http://localhost:3000')
  console.log('⚙️  Backend:  http://localhost:5000')
  console.log('━'.repeat(40))

  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed error:', err)
  process.exit(1)
})
