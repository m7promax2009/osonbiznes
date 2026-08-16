const express = require('express')
const router = express.Router()
const Invoice = require('../models/Invoice')
const { authenticate, requireActiveSubscription } = require('../middleware/auth')
const { validateItems } = require('../utils/sanitize')

const INVOICE_STATUSES = ['pending', 'paid', 'overdue', 'cancelled']

// Muddati o'tgan (dueDate < hozir) va hali 'pending' bo'lgan hisob-fakturalarni
// 'overdue' ga o'tkazadi. O'qishdan oldin chaqiriladi, shunda hisoblar to'g'ri chiqadi.
async function markOverdue(userId) {
  await Invoice.updateMany(
    { userId, status: 'pending', isActive: true, dueDate: { $lt: new Date() } },
    { $set: { status: 'overdue' } }
  )
}

// GET /api/invoices
router.get('/', authenticate, async (req, res) => {
  try {
    await markOverdue(req.user.id)
    const { status } = req.query
    const filter = { userId: req.user.id, isActive: true }

    if (status && status !== 'all') {
      filter.status = status
    }

    const invoices = await Invoice.find(filter).sort({ createdAt: -1 })

    // Stats
    const stats = {
      total: await Invoice.countDocuments({ userId: req.user.id, isActive: true }),
      paid: await Invoice.countDocuments({ userId: req.user.id, status: 'paid', isActive: true }),
      pending: await Invoice.countDocuments({ userId: req.user.id, status: 'pending', isActive: true }),
      overdue: await Invoice.countDocuments({ userId: req.user.id, status: 'overdue', isActive: true }),
    }

    res.json({ success: true, data: invoices, total: invoices.length, stats })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// GET /api/invoices/stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    await markOverdue(req.user.id)
    const [total, paid, pending, overdue] = await Promise.all([
      Invoice.countDocuments({ userId: req.user.id, isActive: true }),
      Invoice.countDocuments({ userId: req.user.id, status: 'paid' }),
      Invoice.countDocuments({ userId: req.user.id, status: 'pending' }),
      Invoice.countDocuments({ userId: req.user.id, status: 'overdue' }),
    ])

    const paidInvoices = await Invoice.find({ userId: req.user.id, status: 'paid' })
    const totalPaid = paidInvoices.reduce((sum, inv) => sum + inv.total, 0)

    res.json({ success: true, data: { total, paid, pending, overdue, totalPaid } })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// GET /api/invoices/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user.id })
    if (!invoice) return res.status(404).json({ success: false, message: 'Hisob-faktura topilmadi' })
    res.json({ success: true, data: invoice })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// POST /api/invoices (obuna faol bo'lishi shart)
router.post('/', authenticate, requireActiveSubscription, async (req, res) => {
  try {
    const { customer, dueDate, notes, taxRate } = req.body

    if (!customer) {
      return res.status(400).json({ success: false, message: 'Mijoz majburiy' })
    }
    const { items, error } = validateItems(req.body.items)
    if (error) return res.status(400).json({ success: false, message: error })

    const rate = Math.max(0, Number(taxRate) || 0)
    const amount = items.reduce((sum, item) => sum + item.price * item.qty, 0)
    const tax = rate ? Math.round((amount * rate) / 100) : 0
    const total = amount + tax

    const invoice = await Invoice.createInvoice({
      userId: req.user.id,
      customer,
      items,
      amount,
      taxRate: rate,
      tax,
      total,
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: notes || '',
    })

    res.status(201).json({ success: true, data: invoice })
  } catch (error) {
    console.error('Invoice create error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// PUT /api/invoices/:id/status
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body
    if (!status || !INVOICE_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Notogri status' })
    }
    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { status } },
      { new: true, runValidators: true }
    )
    if (!invoice) return res.status(404).json({ success: false, message: 'Hisob-faktura topilmadi' })
    res.json({ success: true, data: invoice })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// DELETE /api/invoices/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { isActive: false } },
      { new: true }
    )
    if (!invoice) return res.status(404).json({ success: false, message: 'Hisob-faktura topilmadi' })
    res.json({ success: true, message: 'Hisob-faktura ochirildi' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

module.exports = router
