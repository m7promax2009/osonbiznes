/**
 * OsonBiznes - Ma'lumotlar bazasini to'ldirish skripti
 * 
 * Ishga tushirish: node src/seed.js
 */

const bcrypt = require('bcryptjs')

const seedData = {
  users: [
    {
      name: 'Aziz Tadbirkor',
      email: 'demo@osonbiznes.uz',
      password: bcrypt.hashSync('demo123', 10),
      business: 'Aziz Electronics',
      phone: '+998 90 123 45 67',
      tariff: 'pro',
    },
  ],
  products: [
    { name: 'iPhone 15 Pro 128GB', category: 'Smartfonlar', price: 12500000, cost: 10500000, stock: 15, status: 'active', sku: 'APL-IP15P-128' },
    { name: 'Samsung Galaxy A55', category: 'Smartfonlar', price: 5800000, cost: 4800000, stock: 8, status: 'active', sku: 'SAM-A55-256' },
    { name: 'Xiaomi Redmi Note 13', category: 'Smartfonlar', price: 3200000, cost: 2600000, stock: 3, status: 'low', sku: 'XIA-RN13-128' },
    { name: 'AirPods Pro 2', category: 'Aksessuarlar', price: 2800000, cost: 2200000, stock: 0, status: 'out', sku: 'APL-AIRP2' },
    { name: 'MacBook Air M3', category: 'Noutbuklar', price: 18500000, cost: 15800000, stock: 5, status: 'active', sku: 'APL-MBA-M3' },
    { name: 'Samsung Galaxy Watch 6', category: 'Aksessuarlar', price: 4200000, cost: 3500000, stock: 12, status: 'active', sku: 'SAM-GW6' },
  ],
  customers: [
    { name: 'Alisher Karimov', phone: '+998 90 123 45 67', email: 'alisher@mail.uz', city: 'Toshkent', tags: ['VIP', 'Doimiy'] },
    { name: 'Dilshod Rahimov', phone: '+998 91 234 56 78', email: 'dilshod@mail.uz', city: 'Samarqand', tags: ['Doimiy'] },
    { name: 'Malika Umarova', phone: '+998 93 345 67 89', email: 'malika@mail.uz', city: 'Toshkent', tags: ['VIP', 'Biznes'] },
    { name: 'Jasur Toshmatov', phone: '+998 94 456 78 90', email: 'jasur@mail.uz', city: 'Farg\'ona', tags: ['Yangi'] },
  ],
}

console.log('📦 OsonBiznes - Seed ma\'lumotlar')
console.log('================================')
console.log(`👤 Foydalanuvchilar: ${seedData.users.length} ta`)
console.log(`📱 Mahsulotlar: ${seedData.products.length} ta`)
console.log(`👥 Mijozlar: ${seedData.customers.length} ta`)
console.log('\n✅ Demo login: demo@osonbiznes.uz / demo123')

module.exports = seedData
