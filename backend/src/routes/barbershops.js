const express = require('express')
const mongoose = require('mongoose')
const router = express.Router()
const User = require('../models/User')
const ShopProfile = require('../models/ShopProfile')
const Product = require('../models/Product')
const Booking = require('../models/Booking')

// Ish vaqti slotlari (09:00–19:00, 30 daqiqadan)
function allSlots() {
  const slots = []
  for (let h = 9; h < 19; h++) { slots.push(`${String(h).padStart(2, '0')}:00`); slots.push(`${String(h).padStart(2, '0')}:30`) }
  return slots
}

// Salon(lar) ro'yxati (marketplace) — filial, reyting, xizmat va sartaroshlar bilan
router.get('/', async (req, res) => {
  try {
    const profiles = await ShopProfile.find({ showOnMarketplace: true }).lean()
    const ownerIds = profiles.map(p => p.userId)
    const [owners, barbers, services] = await Promise.all([
      User.find({ _id: { $in: ownerIds } }).select('name business phone').lean(),
      User.find({ ownerId: { $in: ownerIds }, role: 'master' }).select('name specialty skills rating avatar priceFrom branchName ownerId').lean(),
      Product.find({ userId: { $in: ownerIds }, isActive: { $ne: false } }).select('name price category userId').lean(),
    ])
    const ownerMap = Object.fromEntries(owners.map(o => [o._id.toString(), o]))
    const data = profiles.map(p => {
      const oid = p.userId.toString()
      const o = ownerMap[oid] || {}
      return {
        ownerId: p.userId,
        name: o.business || o.name || 'Salon',
        phone: o.phone || '',
        description: p.description,
        city: p.city,
        address: p.address,
        latitude: p.latitude,
        longitude: p.longitude,
        rating: p.rating,
        isVerified: p.isVerified,
        isFeatured: p.isFeatured,
        branches: p.branches && p.branches.length ? p.branches : [{ name: 'Asosiy filial', address: p.address, latitude: p.latitude, longitude: p.longitude, phone: o.phone }],
        services: services.filter(s => s.userId.toString() === oid).map(s => ({ name: s.name, price: s.price })),
        barbers: barbers.filter(b => b.ownerId?.toString() === oid).map(b => ({ _id: b._id, name: b.name, specialty: b.specialty, skills: b.skills, rating: b.rating, avatar: b.avatar, priceFrom: b.priceFrom, branchName: b.branchName })),
      }
    }).filter(s => s.barbers.length > 0) // faqat sartaroshi bor salonlar (auto do'konlar chiqmasin)
    res.json({ success: true, data, total: data.length })
  } catch (error) {
    console.error('Barbershops error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// Barcha sartaroshlar (sartarosh-markazli tanlash) — salon + filial + karta bilan
router.get('/barbers', async (req, res) => {
  try {
    const allBarbers = await User.find({ role: 'master', isActive: true }).select('name specialty skills rating reviewCount avatar priceFrom branchName bio ownerId').lean()
    const ownerIds = [...new Set(allBarbers.map(b => b.ownerId?.toString()).filter(Boolean))]
    const [owners, profiles] = await Promise.all([
      User.find({ _id: { $in: ownerIds } }).select('business name phone').lean(),
      ShopProfile.find({ userId: { $in: ownerIds } }).lean(),
    ])
    const oMap = Object.fromEntries(owners.map(o => [o._id.toString(), o]))
    const pMap = Object.fromEntries(profiles.map(p => [p.userId.toString(), p]))
    // Faqat marketplace'da ko'rinadigan sartaroshxona ustalari (auto ustaxona ustalari chiqmasin)
    const barbers = allBarbers.filter(b => pMap[b.ownerId?.toString()]?.showOnMarketplace)
    const data = barbers.map(b => {
      const oid = b.ownerId?.toString()
      const prof = pMap[oid] || {}
      const branch = (prof.branches || []).find(br => br.name === b.branchName)
      return {
        ...b,
        salonName: oMap[oid]?.business || 'Salon',
        salonPhone: oMap[oid]?.phone || '',
        branchAddress: branch?.address || prof.address || '',
        latitude: branch?.latitude ?? prof.latitude,
        longitude: branch?.longitude ?? prof.longitude,
      }
    })
    res.json({ success: true, data, total: data.length })
  } catch (error) {
    console.error('Barbers error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// Bitta salon tafsiloti
router.get('/:ownerId', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.ownerId)) return res.status(400).json({ success: false, message: 'Notogri salon' })
    const [owner, profile, barbers, services] = await Promise.all([
      User.findById(req.params.ownerId).select('name business phone').lean(),
      ShopProfile.findOne({ userId: req.params.ownerId }).lean(),
      User.find({ ownerId: req.params.ownerId, role: 'master', isActive: true }).select('name specialty skills rating reviewCount avatar priceFrom branchName bio').lean(),
      Product.find({ userId: req.params.ownerId, isActive: { $ne: false } }).select('name price category').lean(),
    ])
    if (!owner) return res.status(404).json({ success: false, message: 'Salon topilmadi' })
    res.json({
      success: true,
      data: {
        ownerId: owner._id,
        name: owner.business || owner.name,
        phone: owner.phone,
        description: profile?.description || '',
        rating: profile?.rating || 5,
        isVerified: profile?.isVerified,
        branches: profile?.branches?.length ? profile.branches : [{ name: 'Asosiy filial', address: profile?.address, latitude: profile?.latitude, longitude: profile?.longitude, phone: owner.phone }],
        barbers,
        services: services.map(s => ({ name: s.name, price: s.price, category: s.category })),
      },
    })
  } catch (error) {
    console.error('Barbershop detail error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// Sartaroshning berilgan kundagi BO'SH vaqtlari
router.get('/barbers/:barberId/slots', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.barberId)) return res.status(400).json({ success: false, message: 'Notogri sartarosh' })
    const date = req.query.date || new Date().toISOString().slice(0, 10)
    const booked = await Booking.find({
      barberId: req.params.barberId, date, isActive: true,
      status: { $in: ['booked', 'arrived'] },
    }).select('timeSlot').lean()
    const taken = new Set(booked.map(b => b.timeSlot))
    const slots = allSlots().map(s => ({ time: s, available: !taken.has(s) }))
    res.json({ success: true, data: { date, slots } })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

module.exports = router
