const express = require('express')
const router = express.Router()
const Product = require('../models/Product')
const User = require('../models/User')
const { authenticate, requireActiveSubscription } = require('../middleware/auth')
const { enforceLimit } = require('../middleware/limits')
const { safeSearchRegex } = require('../utils/sanitize')

// Raqamli maydonlar: manfiy yoki NaN bo'lmasin (aks holda CastError -> 500)
function checkNumbers(fields) {
  for (const [key, val] of Object.entries(fields)) {
    if (val === undefined || val === '' || val === null) continue
    const n = Number(val)
    if (!Number.isFinite(n) || n < 0) return `${key} manfiy bo'lmagan son bo'lishi kerak`
    if (key === 'stock' && !Number.isInteger(n)) return 'Qoldiq butun son bo\'lishi kerak'
  }
  return null
}

// GET /api/products - Barcha mahsulotlar
router.get('/', authenticate, async (req, res) => {
  try {
    const { category, search, status } = req.query
    const filter = { userId: req.user.id, isActive: true }

    if (category && category !== 'Barchasi') {
      filter.category = category
    }
    if (status) {
      filter.status = status
    }
    if (search) {
      filter.$or = [
        { name: safeSearchRegex(search) },
        { sku: safeSearchRegex(search) },
      ]
    }

    const products = await Product.find(filter).sort({ createdAt: -1 })
    
    res.json({ success: true, data: products, total: products.length })
  } catch (error) {
    console.error('Products GET error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// GET /api/products/categories - Kategoriyalar
router.get('/categories', authenticate, async (req, res) => {
  try {
    const categories = await Product.distinct('category', { userId: req.user.id, isActive: true })
    res.json({ success: true, data: categories })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// GET /api/products/stats - Mahsulot statistikasi
router.get('/stats', authenticate, async (req, res) => {
  try {
    const [total, lowStock, outOfStock] = await Promise.all([
      Product.countDocuments({ userId: req.user.id, isActive: true }),
      Product.countDocuments({ userId: req.user.id, isActive: true, stock: { $gt: 0, $lt: 5 } }),
      Product.countDocuments({ userId: req.user.id, isActive: true, stock: { $lte: 0 } }),
    ])

    res.json({
      success: true,
      data: { total, lowStock, outOfStock, active: total - outOfStock },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// GET /api/products/:id - Bitta mahsulot
router.get('/:id', authenticate, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, userId: req.user.id })
    if (!product) {
      return res.status(404).json({ success: false, message: 'Mahsulot topilmadi' })
    }
    res.json({ success: true, data: product })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// POST /api/products - Yangi mahsulot (obuna faol + tarif chekloviga bo'ysunadi)
router.post('/', authenticate, requireActiveSubscription, enforceLimit('products'), async (req, res) => {
  try {
    const { name, category, price, cost, stock, sku, description, images } = req.body

    if (!name || price === undefined || price === '') {
      return res.status(400).json({ success: false, message: 'Nomi va narxi majburiy' })
    }
    const numErr = checkNumbers({ price, cost, stock })
    if (numErr) return res.status(400).json({ success: false, message: numErr })

    const productData = {
      userId: req.user.id,
      name,
      category: category || 'Boshqa',
      price: Number(price),
      cost: Number(cost) || 0,
      stock: Number(stock) || 0,
      sku: sku || '',
      description: description || '',
    }

    // images array (bitta yoki bir nechta)
    if (images && Array.isArray(images)) {
      productData.images = images
    } else if (images && typeof images === 'string') {
      productData.images = [images]
    }

    const product = await Product.create(productData)

    // Update user product count
    await User.findByIdAndUpdate(req.user.id, { $inc: { totalProducts: 1 } })

    res.status(201).json({ success: true, data: product })
  } catch (error) {
    console.error('Product create error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// PUT /api/products/:id - Mahsulotni yangilash
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, category, price, cost, stock, sku, description, images } = req.body
    const update = {}

    if (name !== undefined) update.name = name
    if (category !== undefined) update.category = category
    if (price !== undefined) update.price = Number(price)
    if (cost !== undefined) update.cost = Number(cost)
    const numErr = checkNumbers({ price, cost, stock })
    if (numErr) return res.status(400).json({ success: false, message: numErr })
    if (stock !== undefined) {
      update.stock = Number(stock)
      // findOneAndUpdate pre('save') ni chaqirmaydi — statusni shu yerda hisoblaymiz
      update.status = update.stock <= 0 ? 'out' : update.stock < 5 ? 'low' : 'active'
    }
    if (sku !== undefined) update.sku = sku
    if (description !== undefined) update.description = description
    if (images !== undefined) {
      update.images = Array.isArray(images) ? images : [images]
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: update },
      { new: true, runValidators: true }
    )

    if (!product) {
      return res.status(404).json({ success: false, message: 'Mahsulot topilmadi' })
    }

    res.json({ success: true, data: product })
  } catch (error) {
    console.error('Product update error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// DELETE /api/products/:id - Mahsulotni o'chirish (soft delete)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    // isActive:true sharti — ikki marta o'chirilsa ikkinchisi null qaytaradi,
    // shunda totalProducts hisobi ikki marta kamaymaydi (drift oldini oladi).
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id, isActive: true },
      { $set: { isActive: false } },
      { new: true }
    )

    if (!product) {
      return res.status(404).json({ success: false, message: 'Mahsulot topilmadi' })
    }

    // Update user product count
    await User.findByIdAndUpdate(req.user.id, { $inc: { totalProducts: -1 } })

    res.json({ success: true, message: 'Mahsulot ochirildi' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

module.exports = router
