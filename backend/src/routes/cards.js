const express = require('express')
const router = express.Router()
const Card = require('../models/Card')
const { authenticate } = require('../middleware/auth')

// GET /api/cards - Foydalanuvchining barcha kartalari
router.get('/', authenticate, async (req, res) => {
  try {
    const cards = await Card.find({ userId: req.user.id, isActive: true })
      .sort({ isDefault: -1, createdAt: -1 })
    res.json({ success: true, data: cards })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// POST /api/cards - Yangi karta qo'shish
router.post('/', authenticate, async (req, res) => {
  try {
    const { cardNumber, cardName, method } = req.body

    if (!cardNumber || cardNumber.length < 8) {
      return res.status(400).json({ success: false, message: 'Karta raqami notog\'ri' })
    }

    // Mask card number: faqat oxirgi 4 raqam ko'rinadi
    const clean = cardNumber.replace(/\D/g, '')
    const mask = clean.slice(0, 4) + ' **** **** ' + clean.slice(-4)

    // Check if this card already saved
    const existing = await Card.findOne({
      userId: req.user.id,
      cardMask: mask,
      isActive: true,
    })
    if (existing) {
      return res.status(400).json({ success: false, message: 'Bu karta allaqachon qo\'shilgan' })
    }

    // First card becomes default
    const cardCount = await Card.countDocuments({ userId: req.user.id, isActive: true })

    const card = await Card.create({
      userId: req.user.id,
      cardMask: mask,
      cardName: cardName || 'Karta egasi',
      method: method || 'click',
      isDefault: cardCount === 0,
    })

    res.status(201).json({ success: true, data: card })
  } catch (error) {
    console.error('Card create error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// PUT /api/cards/:id/default - Kartani default qilish
router.put('/:id/default', authenticate, async (req, res) => {
  try {
    // Remove default from all cards
    await Card.updateMany(
      { userId: req.user.id },
      { $set: { isDefault: false } }
    )
    // Set this card as default
    const card = await Card.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { isDefault: true } },
      { new: true }
    )
    if (!card) {
      return res.status(404).json({ success: false, message: 'Karta topilmadi' })
    }
    res.json({ success: true, data: card })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// DELETE /api/cards/:id - Kartani o'chirish
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const card = await Card.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { isActive: false } },
      { new: true }
    )
    if (!card) {
      return res.status(404).json({ success: false, message: 'Karta topilmadi' })
    }

    // If deleted card was default, set another card as default
    if (card.isDefault) {
      const nextCard = await Card.findOne({ userId: req.user.id, isActive: true })
      if (nextCard) {
        nextCard.isDefault = true
        await nextCard.save()
      }
    }

    res.json({ success: true, message: 'Karta ochirildi' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

module.exports = router
