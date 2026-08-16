const express = require('express')
const router = express.Router()
const User = require('../models/User')
const Payment = require('../models/Payment')
const Notification = require('../models/Notification')
const { authenticate } = require('../middleware/auth')

const TARIFF_PRICES = {
  start: 99000,
  pro: 199000,
  business: 499000,
}

const TARIFF_LABELS = {
  start: 'Start',
  pro: 'Pro',
  business: 'Biznes',
}

const SUBSCRIPTION_DAYS = 30

// GET /api/subscription - Joriy obuna holati
router.get('/', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)

    res.json({
      success: true,
      data: {
        tariff: user.tariff,
        tariffStatus: user.tariffStatus,
        trialDaysLeft: user.trialDaysLeft,
        trialEndsAt: user.trialEndsAt,
        subscriptionStart: user.subscriptionStart,
        subscriptionEnd: user.subscriptionEnd,
        autoPayment: user.autoPayment,
        paymentMethod: user.paymentMethod,
        prices: TARIFF_PRICES,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// POST /api/subscription/select - Tarifni tanlash
router.post('/select', authenticate, async (req, res) => {
  try {
    const { tariff } = req.body

    if (!tariff || !TARIFF_PRICES[tariff]) {
      return res.status(400).json({ success: false, message: 'Notogri tarif' })
    }

    const user = await User.findById(req.user.id)
    const price = TARIFF_PRICES[tariff]

    res.json({
      success: true,
      data: {
        tariff,
        price,
        message: `${TARIFF_LABELS[tariff] || tariff} tarifi tanlandi. To'lovni amalga oshiring.`,
        paymentMethods: [
          { method: 'click', label: 'Click', icon: '💳' },
          { method: 'payme', label: 'Payme', icon: '💳' },
        ],
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// POST /api/subscription/pay - To'lovni amalga oshirish
router.post('/pay', authenticate, async (req, res) => {
  try {
    const { tariff, method, phone } = req.body

    if (!tariff || !TARIFF_PRICES[tariff]) {
      return res.status(400).json({ success: false, message: 'Notogri tarif' })
    }

    if (!method || !['click', 'payme'].includes(method)) {
      return res.status(400).json({ success: false, message: 'Notogri tolov usuli' })
    }

    const amount = TARIFF_PRICES[tariff]

    // To'lovni yaratish
    const payment = await Payment.create({
      userId: req.user.id,
      amount,
      method,
      type: 'subscription',
      tariff,
      status: 'pending',
      phone: phone || '',
      description: `${TARIFF_LABELS[tariff] || tariff} tarifi uchun tolov (${amount.toLocaleString()} som)`,
    })

    // Simulate payment gateway redirect
    // Real loyihada Click/Payme API ga so'rov yuboriladi
    res.json({
      success: true,
      data: {
        paymentId: payment._id,
        amount,
        method,
        redirectUrl: method === 'click'
          ? `https://my.click.uz/services/pay?amount=${amount}&merchant=${process.env.CLICK_MERCHANT_ID || 'test'}&transaction=${payment._id}`
          : `https://payme.uz/pay?amount=${amount}&merchant=${process.env.PAYME_MERCHANT_ID || 'test'}&order=${payment._id}`,
        message: `To'lov uchun ${method.toUpperCase()} ga o'tkazilmoqda...`,
      },
    })
  } catch (error) {
    console.error('Payment error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// POST /api/subscription/confirm - To'lovni tasdiqlash (simulated)
router.post('/confirm', authenticate, async (req, res) => {
  try {
    const { transactionId } = req.body

    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'Transaction ID kerak' })
    }

    const payment = await Payment.findById(transactionId)
    if (!payment || payment.userId.toString() !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Tolov topilmadi' })
    }
    if (payment.status === 'success') {
      const u = await User.findById(req.user.id)
      return res.json({ success: true, data: { message: 'Tolov allaqachon tasdiqlangan', tariff: u?.tariff } })
    }

    // XAVFSIZLIK: foydalanuvchi to'lovni O'ZI tasdiqlab, bepul tarif OLA OLMAYDI.
    // Produksiyada faollashtirish faqat Click/Payme callback'i yoki admin tasdig'i orqali.
    if (process.env.NODE_ENV === 'production') {
      try {
        const admin = await User.findOne({ role: 'admin' })
        if (admin) {
          await Notification.send({
            userId: admin._id,
            type: 'admin_message',
            title: 'Yangi tolov tasdiqlashni kutmoqda',
            message: `${req.user.name} — ${payment.amount.toLocaleString()} som (${TARIFF_LABELS[payment.tariff] || payment.tariff}) tolovini yubordi`,
            data: { paymentId: payment._id.toString() },
            urgent: true,
          })
        }
      } catch (_) {}
      return res.json({
        success: true,
        data: {
          pending: true,
          message: "To'lovingiz qabul qilindi va tekshirilmoqda. Tasdiqlangach tarif faollashadi.",
        },
      })
    }

    // DEV/DEMO rejimi: sinov qulayligi uchun darhol faollashtiramiz
    payment.status = 'success'
    await payment.save()

    const user = await User.findById(req.user.id)
    user.tariff = payment.tariff
    user.subscriptionStart = new Date()
    user.subscriptionEnd = new Date(Date.now() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000)
    user.autoPayment = true
    user.paymentMethod = payment.method
    await user.save()

    res.json({
      success: true,
      data: {
        message: `Tabriklaymiz! ${TARIFF_LABELS[payment.tariff] || payment.tariff} tarifi faollashtirildi! (demo rejim)`,
        tariff: user.tariff,
        subscriptionEnd: user.subscriptionEnd,
      },
    })
  } catch (error) {
    console.error('Payment confirm error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// GET /api/subscription/payments - To'lovlar tarixi
router.get('/payments', authenticate, async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(10)

    res.json({ success: true, data: payments })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

module.exports = router
