const express = require('express')
const router = express.Router()
const Customer = require('../models/Customer')
const User = require('../models/User')
const { authenticate, requireActiveSubscription } = require('../middleware/auth')
const { enforceLimit } = require('../middleware/limits')
const { safeSearchRegex } = require('../utils/sanitize')

// GET /api/customers - Mijozlar
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, tag } = req.query
    const filter = { userId: req.user.id, isActive: true }

    if (search) {
      filter.$or = [
        { name: safeSearchRegex(search) },
        { phone: safeSearchRegex(search) },
        { email: safeSearchRegex(search) },
      ]
    }
    if (tag && tag !== 'all') {
      filter.tags = tag
    }

    const customers = await Customer.find(filter).sort({ createdAt: -1 })
    res.json({ success: true, data: customers, total: customers.length })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// GET /api/customers/stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const [total, vipCount] = await Promise.all([
      Customer.countDocuments({ userId: req.user.id, isActive: true }),
      Customer.countDocuments({ userId: req.user.id, tags: 'VIP', isActive: true }),
    ])
    res.json({ success: true, data: { total, vip: vipCount } })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// GET /api/customers/top
router.get('/top', authenticate, async (req, res) => {
  try {
    const top = await Customer.find({ userId: req.user.id, isActive: true })
      .sort({ totalSpent: -1 })
      .limit(5)
    res.json({ success: true, data: top })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// GET /api/customers/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, userId: req.user.id })
    if (!customer) return res.status(404).json({ success: false, message: 'Mijoz topilmadi' })
    res.json({ success: true, data: customer })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// POST /api/customers (obuna faol + tarif chekloviga bo'ysunadi)
router.post('/', authenticate, requireActiveSubscription, enforceLimit('customers'), async (req, res) => {
  try {
    const { name, phone, email, city, address, notes } = req.body
    if (!name) return res.status(400).json({ success: false, message: 'Ism majburiy' })

    const customer = await Customer.create({
      userId: req.user.id,
      name,
      phone: phone || '',
      email: email || '',
      city: city || '',
      address: address || '',
      notes: notes || '',
      tags: ['Yangi'],
    })

    // Foydalanuvchi statistikasini yangilash
    await User.findByIdAndUpdate(req.user.id, { $inc: { totalCustomers: 1 } })

    res.status(201).json({ success: true, data: customer })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// PUT /api/customers/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, phone, email, city, address, notes, tags } = req.body
    const update = {}
    if (name !== undefined) update.name = name
    if (phone !== undefined) update.phone = phone
    if (email !== undefined) update.email = email
    if (city !== undefined) update.city = city
    if (address !== undefined) update.address = address
    if (notes !== undefined) update.notes = notes
    if (tags !== undefined) update.tags = tags

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: update },
      { new: true }
    )

    if (!customer) return res.status(404).json({ success: false, message: 'Mijoz topilmadi' })
    res.json({ success: true, data: customer })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// DELETE /api/customers/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id, isActive: true },
      { $set: { isActive: false } },
      { new: true }
    )
    if (!customer) return res.status(404).json({ success: false, message: 'Mijoz topilmadi' })
    await User.findByIdAndUpdate(req.user.id, { $inc: { totalCustomers: -1 } })
    res.json({ success: true, message: 'Mijoz ochirildi' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

module.exports = router
