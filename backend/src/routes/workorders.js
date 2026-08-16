const express = require('express')
const mongoose = require('mongoose')
const router = express.Router()
const WorkOrder = require('../models/WorkOrder')
const User = require('../models/User')
const { authenticate } = require('../middleware/auth')
const { escapeRegex, safeSearchRegex } = require('../utils/sanitize')

const STATUSES = ['new', 'in_progress', 'ready', 'delivered', 'cancelled']

// Berilgan foydalanuvchi uchun ustaxona (workshop) id'sini aniqlash:
// ega uchun — o'zi; usta uchun — uning ownerId'si.
function workshopId(user) {
  return user.role === 'master' ? user.ownerId : user.id
}

// So'rov filtri: usta faqat o'ziga biriktirilganlarni ko'radi
function scopeFilter(user, extra = {}) {
  const f = { userId: workshopId(user), isActive: true, ...extra }
  if (user.role === 'master') f.assignedMaster = user.id
  return f
}

// ============ PUBLIC: mijoz mashina holatini ko'radi (login shart emas) ============
// GET /api/workorders/status?plate=01A123BC&phone=998901234567
router.get('/status', async (req, res) => {
  try {
    const { plate, phone, number } = req.query
    if (!plate && !number) {
      return res.status(400).json({ success: false, message: 'Davlat raqami yoki buyurtma raqamini kiriting' })
    }
    const filter = { isActive: true }
    if (number) filter.orderNumber = String(number).toUpperCase()
    if (plate) filter.carPlate = { $regex: `^${escapeRegex(String(plate).replace(/\s/g, ''))}$`, $options: 'i' }
    if (phone) filter.customerPhone = { $regex: escapeRegex(String(phone).replace(/\D/g, '').slice(-9)) }

    const order = await WorkOrder.findOne(filter).sort({ createdAt: -1 }).lean()
    if (!order) {
      return res.status(404).json({ success: false, message: 'Buyurtma topilmadi. Raqamni tekshiring.' })
    }
    // Mijozga faqat kerakli maydonlarni qaytaramiz
    res.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        carModel: order.carModel,
        carPlate: order.carPlate,
        status: order.status,
        masterName: order.masterName,
        estimatedReady: order.estimatedReady,
        services: (order.services || []).map(s => s.name),
        total: order.total,
        payment: order.payment,
        cancelReason: order.cancelReason,
        updatedAt: order.updatedAt,
      },
    })
  } catch (error) {
    console.error('Public status error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// ============ Quyidagilar autentifikatsiya talab qiladi ============
router.use(authenticate)

// GET /api/workorders/today - Bosh ekran "Bugun menda nima bor"
router.get('/today', async (req, res) => {
  try {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const wid = workshopId(req.user)

    // Faol (topshirilmagan/bekor qilinmagan) ish buyurtmalari + bugun yaratilganlar
    const activeFilter = scopeFilter(req.user, { status: { $in: ['new', 'in_progress', 'ready'] } })
    const activeOrders = await WorkOrder.find(activeFilter).sort({ createdAt: -1 }).lean()

    // Bugungi statistika (faqat ega uchun to'liq)
    const [readyToday, deliveredToday, cancelledToday, todayCreated] = await Promise.all([
      WorkOrder.countDocuments(scopeFilter(req.user, { status: 'ready' })),
      WorkOrder.find(scopeFilter(req.user, { status: 'delivered', updatedAt: { $gte: todayStart } })).lean(),
      WorkOrder.countDocuments(scopeFilter(req.user, { status: 'cancelled', updatedAt: { $gte: todayStart } })),
      WorkOrder.countDocuments(scopeFilter(req.user, { createdAt: { $gte: todayStart } })),
    ])

    const todayRevenue = deliveredToday.reduce((sum, o) => sum + (o.total || 0), 0)

    // Usta yuklamasi (ega uchun)
    let masterLoad = []
    if (req.user.role === 'shop_owner') {
      const masters = await User.find({ ownerId: wid, role: 'master' }).select('name specialty').lean()
      masterLoad = await Promise.all(masters.map(async (m) => ({
        _id: m._id,
        name: m.name,
        specialty: m.specialty,
        active: await WorkOrder.countDocuments({ userId: wid, assignedMaster: m._id, isActive: true, status: { $in: ['new', 'in_progress'] } }),
      })))
    }

    res.json({
      success: true,
      data: {
        role: req.user.role,
        activeOrders,
        stats: {
          inShop: activeOrders.length,
          ready: readyToday,
          newToday: todayCreated,
          deliveredToday: deliveredToday.length,
          cancelledToday,
          todayRevenue,
        },
        masterLoad,
      },
    })
  } catch (error) {
    console.error('Today board error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// GET /api/workorders - ro'yxat (ega: hammasi, usta: o'ziniki)
router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query
    const filter = scopeFilter(req.user)
    if (status && status !== 'all' && STATUSES.includes(status)) filter.status = status
    if (search) {
      filter.$or = [
        { carPlate: safeSearchRegex(search) },
        { carModel: safeSearchRegex(search) },
        { customerName: safeSearchRegex(search) },
        { orderNumber: safeSearchRegex(search) },
      ]
    }
    const orders = await WorkOrder.find(filter).sort({ createdAt: -1 }).lean()

    const base = scopeFilter(req.user)
    const counts = {
      all: await WorkOrder.countDocuments(base),
      new: await WorkOrder.countDocuments({ ...base, status: 'new' }),
      in_progress: await WorkOrder.countDocuments({ ...base, status: 'in_progress' }),
      ready: await WorkOrder.countDocuments({ ...base, status: 'ready' }),
      delivered: await WorkOrder.countDocuments({ ...base, status: 'delivered' }),
      cancelled: await WorkOrder.countDocuments({ ...base, status: 'cancelled' }),
    }
    res.json({ success: true, data: orders, total: orders.length, counts })
  } catch (error) {
    console.error('WorkOrders list error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// GET /api/workorders/masters - egaga tegishli ustalar
router.get('/masters', async (req, res) => {
  try {
    if (req.user.role !== 'shop_owner') return res.status(403).json({ success: false, message: 'Faqat ega uchun' })
    const masters = await User.find({ ownerId: req.user.id, role: 'master' }).select('name specialty email isActive').lean()
    res.json({ success: true, data: masters })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// POST /api/workorders/masters - yangi usta qo'shish (ega)
router.post('/masters', async (req, res) => {
  try {
    if (req.user.role !== 'shop_owner') return res.status(403).json({ success: false, message: 'Faqat ega uchun' })
    const { name, email, password, specialty, phone } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Ism, email va parol majburiy' })
    }
    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) return res.status(400).json({ success: false, message: 'Bu email band' })
    const master = await User.create({
      name, email: email.toLowerCase(), password, phone: phone || '',
      role: 'master', ownerId: req.user.id, specialty: specialty || '', tariff: 'business',
    })
    res.status(201).json({ success: true, data: { _id: master._id, name: master.name, email: master.email, specialty: master.specialty } })
  } catch (error) {
    console.error('Create master error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// POST /api/workorders - yangi ish buyurtmasi (ega)
router.post('/', async (req, res) => {
  try {
    if (req.user.role !== 'shop_owner') return res.status(403).json({ success: false, message: 'Faqat ega ish buyurtmasi ochadi' })
    const { customerName, customerPhone, carModel, carPlate, services, parts, assignedMaster, estimatedReady, notes } = req.body
    if (!customerName || !carModel) {
      return res.status(400).json({ success: false, message: 'Mijoz ismi va mashina modeli majburiy' })
    }

    const cleanServices = Array.isArray(services) ? services.filter(s => s && s.name).map(s => ({ name: String(s.name), price: Math.max(0, Number(s.price) || 0) })) : []
    const cleanParts = Array.isArray(parts) ? parts.filter(p => p && p.name).map(p => ({ name: String(p.name), qty: Math.max(1, parseInt(p.qty) || 1), price: Math.max(0, Number(p.price) || 0) })) : []

    let masterName = ''
    let masterId = null
    if (assignedMaster && mongoose.isValidObjectId(assignedMaster)) {
      const m = await User.findOne({ _id: assignedMaster, ownerId: req.user.id, role: 'master' }).select('name').lean()
      if (m) { masterId = m._id; masterName = m.name }
    }

    const total = cleanServices.reduce((s, x) => s + x.price, 0) + cleanParts.reduce((s, x) => s + x.price * x.qty, 0)

    const order = await WorkOrder.createOrder({
      userId: req.user.id,
      customerName, customerPhone: customerPhone || '',
      carModel, carPlate: (carPlate || '').replace(/\s/g, ''),
      services: cleanServices, parts: cleanParts,
      assignedMaster: masterId, masterName,
      status: 'new',
      estimatedReady: estimatedReady ? new Date(estimatedReady) : null,
      total,
      notes: notes || '',
    })
    res.status(201).json({ success: true, data: order })
  } catch (error) {
    console.error('WorkOrder create error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// PUT /api/workorders/:id/status - status o'zgartirish (ega yoki biriktirilgan usta)
router.put('/:id/status', async (req, res) => {
  try {
    const { status, payment } = req.body
    if (status && !STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Notogri status' })
    }
    const filter = scopeFilter(req.user, { _id: req.params.id })
    const update = {}
    if (status) update.status = status
    if (payment && ['unpaid', 'paid'].includes(payment)) update.payment = payment
    // Topshirilganda avtomatik to'langan deb belgilash mumkin — bu yerda qoldiramiz
    if (!Object.keys(update).length) return res.status(400).json({ success: false, message: 'Ozgartirish yoq' })

    const order = await WorkOrder.findOneAndUpdate(filter, { $set: update }, { new: true, runValidators: true })
    if (!order) return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' })
    res.json({ success: true, data: order })
  } catch (error) {
    console.error('Status update error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// POST /api/workorders/:id/cancel - bekor qilish (ega) — sabab bilan
router.post('/:id/cancel', async (req, res) => {
  try {
    if (req.user.role !== 'shop_owner') return res.status(403).json({ success: false, message: 'Faqat ega bekor qiladi' })
    const { reason } = req.body
    const order = await WorkOrder.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id, isActive: true },
      { $set: { status: 'cancelled', cancelReason: reason || 'Sabab korsatilmagan' } },
      { new: true }
    )
    if (!order) return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' })
    res.json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// PUT /api/workorders/:id - to'liq tahrirlash (ega): usta biriktirish, tayyor vaqti, xizmatlar
router.put('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'shop_owner') return res.status(403).json({ success: false, message: 'Faqat ega' })
    const { assignedMaster, estimatedReady, notes, customerPhone } = req.body
    const update = {}
    if (customerPhone !== undefined) update.customerPhone = customerPhone
    if (estimatedReady !== undefined) update.estimatedReady = estimatedReady ? new Date(estimatedReady) : null
    if (notes !== undefined) update.notes = notes
    if (assignedMaster !== undefined) {
      if (assignedMaster && mongoose.isValidObjectId(assignedMaster)) {
        const m = await User.findOne({ _id: assignedMaster, ownerId: req.user.id, role: 'master' }).select('name').lean()
        update.assignedMaster = m ? m._id : null
        update.masterName = m ? m.name : ''
      } else {
        update.assignedMaster = null
        update.masterName = ''
      }
    }
    const order = await WorkOrder.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id, isActive: true },
      { $set: update }, { new: true }
    )
    if (!order) return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' })
    res.json({ success: true, data: order })
  } catch (error) {
    console.error('WorkOrder update error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

module.exports = router
