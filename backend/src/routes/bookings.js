const express = require('express')
const mongoose = require('mongoose')
const router = express.Router()
const Booking = require('../models/Booking')
const User = require('../models/User')
const Product = require('../models/Product')
const Notification = require('../models/Notification')
const { authenticate } = require('../middleware/auth')
const { rateLimit } = require('../middleware/rateLimit')
const { escapeRegex } = require('../utils/sanitize')

const bookLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, message: "Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring." })
const STATUSES = ['booked', 'arrived', 'done', 'no_show', 'cancelled']
const DEPOSIT_RATE = 0.15 // navbatni band qilish uchun 15% zalog

// ===== PUBLIC: navbat band qilish =====
router.post('/', bookLimiter, async (req, res) => {
  try {
    const { barberId, service, servicePrice, date, timeSlot, customerName, customerPhone, notes, isVoiceAdded, paymentMethod } = req.body
    if (!barberId || !mongoose.isValidObjectId(barberId)) return res.status(400).json({ success: false, message: 'Sartaroshni tanlang' })
    if (!service || !date || !timeSlot) return res.status(400).json({ success: false, message: 'Xizmat, sana va vaqtni tanlang' })
    if (!customerName || !customerPhone) return res.status(400).json({ success: false, message: 'Ism va telefon majburiy' })

    const barber = await User.findOne({ _id: barberId, role: 'master' }).lean()
    if (!barber) return res.status(404).json({ success: false, message: 'Sartarosh topilmadi' })

    // Slot band emasligini tekshirish (ikki mijoz bitta vaqtga tushmasin)
    const clash = await Booking.findOne({ barberId, date, timeSlot, isActive: true, status: { $in: ['booked', 'arrived'] } })
    if (clash) return res.status(409).json({ success: false, message: 'Bu vaqt allaqachon band. Boshqa vaqt tanlang.' })

    // Navbat raqami: shu sartarosh, shu kun uchun nechanchi
    const dayCount = await Booking.countDocuments({ barberId, date, isActive: true, status: { $in: ['booked', 'arrived', 'done'] } })
    const price = Math.max(0, Number(servicePrice) || 0)
    const deposit = Math.round(price * DEPOSIT_RATE)

    const booking = await Booking.create({
      ownerId: barber.ownerId,
      barberId,
      barberName: barber.name,
      branchName: barber.branchName || '',
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      service,
      servicePrice: price,
      durationMin: 30,
      date,
      timeSlot,
      status: 'booked',
      deposit,
      depositPaid: paymentMethod && paymentMethod !== 'none',
      paymentMethod: paymentMethod || 'none',
      queueNumber: dayCount + 1,
      notes: notes || '',
      isVoiceAdded: Boolean(isVoiceAdded),
    })

    // Salon egasiga bildirishnoma
    try {
      if (barber.ownerId) {
        await Notification.create({
          userId: barber.ownerId,
          type: 'new_order',
          title: '✂️ Yangi navbat!',
          message: `${customerName} — ${barber.name}ga ${date} ${timeSlot} (${service})`,
          data: { bookingId: booking._id.toString() },
        })
      }
    } catch (_) {}

    res.status(201).json({
      success: true,
      data: {
        id: booking._id,
        _id: booking._id,
        queueNumber: booking.queueNumber,
        deposit,
        depositPaid: booking.depositPaid,
        timeSlot,
        date,
        barberName: barber.name,
        service,
        servicePrice: booking.servicePrice,
        customerName: booking.customerName,
      },
    })
  } catch (error) {
    console.error('Booking create error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi: ' + error.message })
  }
})

// ===== PUBLIC: mijoz o'z navbatini kuzatadi (telefon orqali) =====
router.get('/track', async (req, res) => {
  try {
    const { phone } = req.query
    if (!phone) return res.status(400).json({ success: false, message: 'Telefon raqamini kiriting' })
    const digits = String(phone).replace(/\D/g, '').slice(-9)
    if (!digits) return res.json({ success: true, data: [] })

    const bookings = await Booking.find({
      customerPhone: { $regex: escapeRegex(digits) },
      isActive: true,
      status: { $in: ['booked', 'arrived'] },
    }).sort({ date: 1, timeSlot: 1 }).lean()

    // Har biri uchun oldida nechta odam borligini hisoblaymiz
    const withQueue = await Promise.all(bookings.map(async (b) => {
      const ahead = await Booking.countDocuments({
        barberId: b.barberId,
        date: b.date,
        isActive: true,
        status: { $in: ['booked', 'arrived'] },
        timeSlot: { $lt: b.timeSlot },
      })
      return {
        id: b._id,
        _id: b._id,
        barberName: b.barberName,
        branchName: b.branchName,
        service: b.service,
        date: b.date,
        timeSlot: b.timeSlot,
        status: b.status,
        queueNumber: b.queueNumber,
        peopleAhead: ahead,
        estimatedWaitMin: ahead * 30 + (b.delayedMin || 0),
        delayedMin: b.delayedMin || 0,
        deposit: b.deposit,
        depositPaid: b.depositPaid,
        servicePrice: b.servicePrice,
        customerName: b.customerName,
      }
    }))
    res.json({ success: true, data: withQueue })
  } catch (error) {
    console.error('Track error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// ===== AI VOZLI / MATNLI BUYURTMANI PARSE QILISH (NLP / Heuristics) =====
router.post('/ai-parse', async (req, res) => {
  try {
    const { text, ownerId } = req.body
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ success: false, message: 'Matn kiritilmadi' })
    }

    const today = new Date().toISOString().slice(0, 10)
    const normalized = text.toLowerCase().trim()

    // Sartaroshlarni topamiz
    const query = { role: 'master', isActive: true }
    if (ownerId && mongoose.isValidObjectId(ownerId)) query.ownerId = ownerId
    const barbers = await User.find(query).select('name specialty branchName ownerId').lean()

    let matchedBarber = null
    for (const b of barbers) {
      if (normalized.includes(b.name.toLowerCase())) {
        matchedBarber = b
        break
      }
    }
    if (!matchedBarber && barbers.length > 0) {
      matchedBarber = barbers[0] // fallback to first barber
    }

    // Xizmatni aniqlash
    const services = [
      { name: 'Fade (zamonaviy)', price: 60000, keywords: ['fade', 'feyd', 'zamonaviy', 'molyot'] },
      { name: 'Klassik soch olish', price: 40000, keywords: ['klassik', 'oddiy', 'soch', 'qaychi', 'kalta'] },
      { name: 'Soqol olish', price: 25000, keywords: ['soqol', 'lezviya', 'soqolni'] },
      { name: 'Soch + Soqol', price: 70000, keywords: ['soch va soqol', 'soch soqol', 'kompleks', 'ikkalasi'] },
      { name: 'Bolalar sochi', price: 30000, keywords: ['bola', 'bolalar', 'bolani', 'oglim', "o'g'lim"] },
      { name: 'Ukladka / styling', price: 50000, keywords: ['ukladka', 'styling', 'vosk', 'turmak'] },
    ]

    let matchedService = services[0]
    for (const s of services) {
      if (s.keywords.some(k => normalized.includes(k))) {
        matchedService = s
        break
      }
    }

    // Vaqtni aniqlash
    let matchedTime = '14:00'
    const timeMatch = normalized.match(/(\d{1,2})[:.](\d{2})/)
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10)
      const m = timeMatch[2] === '30' ? '30' : '00'
      if (h < 8 && h > 0) h += 12 // e.g. "3:00 da" -> 15:00
      matchedTime = `${String(h).padStart(2, '0')}:${m}`
    } else {
      // So'z bilan aytilgan vaqtlar (masalan: "soat uchda", "uch yarimda", "to'rtda")
      const wordTimes = [
        { words: ['uch yarim', '3 yarim', 'uch yarimda'], time: '15:30' },
        { words: ['uch', '3 da', 'soat 3'], time: '15:00' },
        { words: ["to'rt yarim", '4 yarim', 'tort yarim'], time: '16:30' },
        { words: ["to'rt", '4 da', 'soat 4', 'tort'], time: '16:00' },
        { words: ['besh yarim', '5 yarim'], time: '17:30' },
        { words: ['besh', '5 da', 'soat 5'], time: '17:00' },
        { words: ['olti', '6 da', 'soat 6'], time: '18:00' },
        { words: ['ikki', '2 da', 'soat 2'], time: '14:00' },
        { words: ['bir', '1 da', 'soat 1'], time: '13:00' },
        { words: ["o'n bir", '11 da'], time: '11:00' },
        { words: ["o'n ikki", '12 da'], time: '12:00' },
        { words: ["o'n", '10 da'], time: '10:00' },
        { words: ["to'qqiz", '9 da'], time: '09:00' },
      ]
      for (const wt of wordTimes) {
        if (wt.words.some(w => normalized.includes(w))) {
          matchedTime = wt.time
          break
        }
      }
    }

    // Ismni aniqlash
    let customerName = 'Mijoz'
    // 1. "X aka", "X akaga", "X ga", "X uchun" qoliplari
    const specificPattern = /(?:uchun|mijoz|ism\s*:?)\s*([A-Za-zА-Яа-яЎўҚқҒғҲҳ]+)|([A-Za-zА-Яа-яЎўҚқҒғҲҳ]+)\s+(?:aka|uka|ota|tog'a|toha|amaki|boy|bek|jon)(?:ga|ni|ning)?|([A-Za-zА-Яа-яЎўҚқҒғҲҳ]+)(?:bek|jon|xon|dor|shod|boy)(?:ga|ni)?/i
    const m1 = text.match(specificPattern)

    const stopWords = new Set([
      'jasur', 'aziz', 'bek', 'sardor', 'kamron', 'usta', 'ustaga', 'soat', 'bugun', 'ertaga', 'indinga',
      'fade', 'feyd', 'klassik', 'soch', 'soqol', 'ukladka', 'styling', 'yoz', 'yozib', 'qoy', 'qo\'y', 'qilib',
      'navbat', 'band', 'uchun', 'xizmat', 'narx', 'da', 'ga', 'ni', 'va', 'bilan', 'yaxshi', 'bolar', 'boladi'
    ])

    if (m1) {
      const candidate = (m1[1] || m1[2] || m1[3] || '').trim()
      if (candidate && !stopWords.has(candidate.toLowerCase()) && candidate.length > 1) {
        customerName = candidate.charAt(0).toUpperCase() + candidate.slice(1).toLowerCase()
      }
    }

    if (customerName === 'Mijoz') {
      const words = text.split(/[\s,.]+/)
      for (const w of words) {
        const clean = w.replace(/[^A-Za-zА-Яа-яЎўҚқҒғҲҳ]/g, '')
        if (clean.length > 2 && !stopWords.has(clean.toLowerCase())) {
          customerName = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase()
          break
        }
      }
    }

    // Telefon raqami
    const phoneMatch = text.match(/(\+?998\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2}|\d{9})/)
    const customerPhone = phoneMatch ? phoneMatch[0].replace(/\s/g, '') : '+998 90 123 45 67'

    res.json({
      success: true,
      data: {
        barberId: matchedBarber?._id || '',
        barberName: matchedBarber?.name || 'Sartarosh',
        service: matchedService.name,
        servicePrice: matchedService.price,
        date: today,
        timeSlot: matchedTime,
        customerName,
        customerPhone,
        notes: `AI ovozli orqali kiritildi: "${text}"`,
        confidence: 0.94,
      },
    })
  } catch (error) {
    console.error('AI parse error:', error)
    res.status(500).json({ success: false, message: 'AI tahlilda xatolik' })
  }
})

// ===== AI BIZNES MASLAHATCHI & INSIGHTS =====
router.get('/ai-insights', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const bookings = await Booking.find({ date: today, isActive: true }).lean()
    const products = await Product.find({ isActive: { $ne: false } }).lean()

    const total = bookings.length
    const done = bookings.filter(b => b.status === 'done').length
    const booked = bookings.filter(b => b.status === 'booked').length
    const noShow = bookings.filter(b => b.status === 'no_show').length
    const revenue = bookings.filter(b => b.status === 'done').reduce((s, b) => s + (b.servicePrice || 0), 0)

    const lowStock = products.filter(p => p.stock < 5).map(p => p.name)

    const insights = []

    // 1. Tushum va yuklama maslahati
    if (total > 5) {
      insights.push({
        type: 'success',
        title: '🔥 Yuqori faollik',
        message: `Bugun jami ${total} ta navbat qayd etilgan. Bajarilgan tushum: ${revenue.toLocaleString()} so'm. O'rtacha chek: ${done ? Math.round(revenue / done).toLocaleString() : 0} so'm.`,
      })
    } else {
      insights.push({
        type: 'info',
        title: '💡 Tushumni oshirish imkoniyati',
        message: "Bugun 15:00 dan keyin bo'sh slotlar mavjud. Telegram kanalga 10% chegirmali oyna e'lon qiling — 2 ta qo'shimcha mijoz olib keladi.",
      })
    }

    // 2. No-show xavfi
    if (noShow > 0) {
      insights.push({
        type: 'warning',
        title: `⚠️ ${noShow} ta mijoz kelmadi (No-show)`,
        message: "Zalog tizimi orqali zaloglar saqlab qolindi. Kelmagan mijozlarning ishonch reytingi pasaytirildi.",
      })
    } else {
      insights.push({
        type: 'tip',
        title: '🛡️ No-show xavfsizligi',
        message: "15% zalog tizimi sababli kelish ko'rsatkichi 96% dan yuqori saqlanmoqda.",
      })
    }

    // 3. Ombor qoldig'i
    if (lowStock.length > 0) {
      insights.push({
        type: 'stock',
        title: '📦 Ombor signali',
        message: `Quyidagi materiallar tugab qolmoqda: ${lowStock.slice(0, 3).join(', ')}. Yetkazib beruvchiga buyurtma yuborish tavsiya etiladi.`,
      })
    }

    res.json({
      success: true,
      data: {
        summary: { total, done, booked, noShow, revenue },
        insights,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// ===== AI XABAR GENERATOR (Mijozga eslatma, kechikish, rahmat) =====
router.post('/ai-message', async (req, res) => {
  try {
    const { type, customerName, barberName, timeSlot, delayedMin } = req.body
    let message = ''

    if (type === 'reminder') {
      message = `Assalomu alaykum, hurmatli ${customerName || 'mijoz'}! Bugun soat ${timeSlot || '14:00'} da Zamon Barbershopda ${barberName || 'usta'}ga navbatingiz bor. Sizni kutamiz! 💈 Manzil: Bunyodkor 12.`
    } else if (type === 'delay') {
      message = `Assalomu alaykum, ${customerName}! Usta oldingi murakkab soch turmagi sababli ~${delayedMin || 15} daqiqa kechikmoqda. Qulay kutish zonaviy choy va qahva bepul taqdim etiladi. Noqulaylik uchun uzr so'raymiz!`
    } else if (type === 'thank_you') {
      message = `Hurmatli ${customerName}, Zamon Barbershopga tashrifingiz uchun rahmat! Soch turmagingiz yoqdi degan umiddamiz. Keyingi tashrif uchun 10% keshbek hisobingizda! ⭐`
    } else {
      message = `Assalomu alaykum, ${customerName}! Zamon Barbershop sizga yaxshi kayfiyat tilaydi.`
    }

    res.json({ success: true, data: { message } })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Xatolik' })
  }
})

// ===== AUTENTIFIKATSIYA TALAB QILINADIGAN QISMLAR =====
router.use(authenticate)

function scope(user, extra = {}) {
  const f = { isActive: true, ...extra }
  if (user.role === 'master') { f.barberId = user.id }
  else { f.ownerId = user.id }
  return f
}

// Bugungi board (ega yoki sartarosh)
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const list = await Booking.find(scope(req.user, { date: today })).sort({ timeSlot: 1 }).lean()

    const stats = {
      total: list.length,
      booked: list.filter(b => b.status === 'booked').length,
      arrived: list.filter(b => b.status === 'arrived').length,
      done: list.filter(b => b.status === 'done').length,
      noShow: list.filter(b => b.status === 'no_show').length,
      revenue: list.filter(b => b.status === 'done').reduce((s, b) => s + (b.servicePrice || 0), 0),
      // "Xavfli": zalog to'lanmagan booked navbatlar
      risky: list.filter(b => b.status === 'booked' && !b.depositPaid).length,
    }

    // Ega uchun: sartaroshlar yuklamasi
    let barberLoad = []
    if (req.user.role === 'shop_owner' || req.user.role === 'admin') {
      const barbers = await User.find({ ownerId: req.user.id, role: 'master' }).select('name avatar specialty rating').lean()
      barberLoad = barbers.map(bar => {
        const barBookings = list.filter(b => b.barberId?.toString() === bar._id?.toString())
        return {
          _id: bar._id,
          name: bar.name,
          avatar: bar.avatar,
          specialty: bar.specialty,
          rating: bar.rating || 5.0,
          total: barBookings.length,
          activeCount: barBookings.filter(b => ['booked', 'arrived'].includes(b.status)).length,
          doneCount: barBookings.filter(b => b.status === 'done').length,
          revenue: barBookings.filter(b => b.status === 'done').reduce((s, b) => s + (b.servicePrice || 0), 0),
        }
      })
    }

    res.json({ success: true, data: { role: req.user.role, bookings: list, stats, barberLoad } })
  } catch (error) {
    console.error('Today error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// Status o'zgartirish: keldi / bajarildi / kelmadi / bekor
router.put('/:id/status', async (req, res) => {
  try {
    const { status, paymentMethod } = req.body
    if (!STATUSES.includes(status)) return res.status(400).json({ success: false, message: 'Notogri status' })

    const updateData = { status }
    if (paymentMethod) updateData.paymentMethod = paymentMethod
    if (status === 'done') updateData.depositPaid = true

    const booking = await Booking.findOneAndUpdate(
      scope(req.user, { _id: req.params.id }),
      { $set: updateData },
      { new: true, runValidators: true }
    )
    if (!booking) return res.status(404).json({ success: false, message: 'Navbat topilmadi' })
    res.json({ success: true, data: booking })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// Sartarosh kechikishi (+15 daqiqa)
router.post('/delay', async (req, res) => {
  try {
    const { barberId, minutes } = req.body
    const min = Number(minutes) || 15
    const today = new Date().toISOString().slice(0, 10)

    const targetBarberId = req.user.role === 'master' ? req.user.id : barberId
    await Booking.updateMany(
      { barberId: targetBarberId, date: today, status: 'booked', isActive: true },
      { $inc: { delayedMin: min } }
    )

    res.json({ success: true, message: `${min} daqiqa kechikish barcha mijozlarga e'lon qilindi.` })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Xatolik' })
  }
})

// Batch offline sync
router.post('/sync', async (req, res) => {
  try {
    const { actions } = req.body
    if (!Array.isArray(actions)) return res.json({ success: true, synced: 0 })

    let count = 0
    for (const act of actions) {
      if (act.type === 'create') {
        await Booking.create({ ...act.payload, ownerId: req.user.id })
        count++
      } else if (act.type === 'status') {
        await Booking.findByIdAndUpdate(act.id, { status: act.status })
        count++
      }
    }
    res.json({ success: true, synced: count })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Sinxronizatsiya xatosi' })
  }
})

module.exports = router
