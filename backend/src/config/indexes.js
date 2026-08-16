/**
 * MongoDB Indexes for Performance
 * 
 * This file can be:
 * 1. Imported programmatically (const { createIndexes } = require('./config/indexes'))
 * 2. Run standalone (node src/config/indexes.js)
 */

const mongoose = require('mongoose')

async function createIndexes() {
  if (!mongoose.connection?.db) {
    console.log('❌ No database connection available')
    return false
  }
  
  const db = mongoose.connection.db
  console.log('  📊 Creating indexes...')

  // --- Users ---
  try {
    await db.collection('users').createIndexes([
      { key: { email: 1 }, unique: true, background: true },
      { key: { role: 1, isActive: 1 }, background: true },
      { key: { role: 1, tariff: 1 }, background: true },
      { key: { tariff: 1, trialEndsAt: 1 }, background: true },
      { key: { subscriptionEnd: 1 }, background: true },
    ])
    console.log('  ✅ users')
  } catch (e) { console.log('  ⚠️ users:', e.message) }

  // --- Products ---
  try {
    await db.collection('products').createIndexes([
      { key: { userId: 1, isActive: 1 }, background: true },
      { key: { userId: 1, category: 1 }, background: true },
      { key: { userId: 1, name: 1 }, background: true },
      { key: { userId: 1, status: 1 }, background: true },
      { key: { userId: 1, createdAt: -1 }, background: true },
    ])
    console.log('  ✅ products')
  } catch (e) { console.log('  ⚠️ products:', e.message) }

  // --- Orders ---
  try {
    // Eski global-unique orderNumber indeksi bo'lsa, tashlaymiz (endi u compound).
    await db.collection('orders').dropIndex('orderNumber_1').catch(() => {})
    await db.collection('orders').createIndexes([
      { key: { userId: 1, createdAt: -1 }, background: true },
      { key: { userId: 1, status: 1 }, background: true },
      // Raqam faqat do'kon ichida unique
      { key: { userId: 1, orderNumber: 1 }, unique: true, background: true },
    ])
    console.log('  ✅ orders')
  } catch (e) { console.log('  ⚠️ orders:', e.message) }

  // --- Customers ---
  try {
    await db.collection('customers').createIndexes([
      { key: { userId: 1, createdAt: -1 }, background: true },
      { key: { userId: 1, name: 1 }, background: true },
    ])
    console.log('  ✅ customers')
  } catch (e) { console.log('  ⚠️ customers:', e.message) }

  // --- Invoices ---
  try {
    await db.collection('invoices').dropIndex('invoiceNumber_1').catch(() => {})
    await db.collection('invoices').createIndexes([
      { key: { userId: 1, createdAt: -1 }, background: true },
      { key: { userId: 1, status: 1 }, background: true },
      { key: { userId: 1, invoiceNumber: 1 }, unique: true, background: true },
    ])
    console.log('  ✅ invoices')
  } catch (e) { console.log('  ⚠️ invoices:', e.message) }

  // --- Notifications ---
  try {
    await db.collection('notifications').createIndexes([
      { key: { userId: 1, createdAt: -1 }, background: true },
      { key: { userId: 1, read: 1, createdAt: -1 }, background: true },
    ])
    console.log('  ✅ notifications')
  } catch (e) { console.log('  ⚠️ notifications:', e.message) }

  console.log('  ✅ All indexes created')
  return true
}

// Run standalone
if (require.main === module) {
  (async () => {
    const { connectDB } = require('./db')
    await connectDB()
    if (mongoose.connection.readyState === 1) {
      await createIndexes()
    }
    process.exit(0)
  })().catch(err => {
    console.error('Index creation error:', err)
    process.exit(1)
  })
}

module.exports = { createIndexes }
