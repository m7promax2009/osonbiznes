const express = require('express')
const mongoose = require('mongoose')
const router = express.Router()
const Order = require('../models/Order')
const User = require('../models/User')
const Customer = require('../models/Customer')
const Product = require('../models/Product')
const { authenticate, requireActiveSubscription } = require('../middleware/auth')
const { validateItems, escapeRegex, safeSearchRegex } = require('../utils/sanitize')

const ORDER_STATUSES = ['pending', 'processing', 'completed', 'cancelled']
const PAYMENT_STATUSES = ['unpaid', 'paid', 'refunded', 'partially_paid']

// GET /api/orders - Buyurtmalar
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, search } = req.query
    const filter = { userId: req.user.id, isActive: true }

    if (status && status !== 'all') {
      filter.status = status
    }
    if (search) {
      filter.$or = [
        { customer: safeSearchRegex(search) },
        { orderNumber: safeSearchRegex(search) },
      ]
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 })
    
    // Statuslar bo'yicha count
    const counts = {
      all: await Order.countDocuments({ userId: req.user.id, isActive: true }),
      pending: await Order.countDocuments({ userId: req.user.id, status: 'pending', isActive: true }),
      processing: await Order.countDocuments({ userId: req.user.id, status: 'processing', isActive: true }),
      completed: await Order.countDocuments({ userId: req.user.id, status: 'completed', isActive: true }),
      cancelled: await Order.countDocuments({ userId: req.user.id, status: 'cancelled', isActive: true }),
    }

    res.json({ success: true, data: orders, total: orders.length, counts })
  } catch (error) {
    console.error('Orders GET error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// GET /api/orders/stats - Buyurtma statistikasi
router.get('/stats', authenticate, async (req, res) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const [todayOrders, totalOrders, pendingOrders] = await Promise.all([
      Order.find({ userId: req.user.id, createdAt: { $gte: today } }),
      Order.countDocuments({ userId: req.user.id, status: { $ne: 'cancelled' } }),
      Order.countDocuments({ userId: req.user.id, status: 'pending' }),
    ])

    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0)
    
    res.json({
      success: true,
      data: {
        today: todayOrders.length,
        total: totalOrders,
        pending: pendingOrders,
        todayRevenue,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// GET /api/orders/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    // 'analytics' kabi noto'g'ri ObjectId'lar keyingi route'ga o'tsin (aks holda cast xatosi)
    if (!mongoose.isValidObjectId(req.params.id)) return next()
    const order = await Order.findOne({ _id: req.params.id, userId: req.user.id })
    if (!order) return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' })
    res.json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// POST /api/orders - Yangi buyurtma (obuna faol bo'lishi shart)
router.post('/', authenticate, requireActiveSubscription, async (req, res) => {
  try {
    const { customer, phone, paymentMethod, source, notes } = req.body

    if (!customer) {
      return res.status(400).json({ success: false, message: 'Mijoz majburiy' })
    }
    // Item'larni server tomonida tekshirish (qty butun>=1, price>=0)
    const { items, error } = validateItems(req.body.items)
    if (error) return res.status(400).json({ success: false, message: error })

    // Hisob-kitob server tomonida (chegirma bilan)
    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0)
    const discount = Math.max(0, Number(req.body.discount) || 0)
    const total = Math.max(0, subtotal - discount)

    const order = await Order.createOrder({
      userId: req.user.id,
      customer,
      phone: phone || '',
      items,
      subtotal,
      discount,
      total,
      paymentMethod: paymentMethod || '',
      source: source || 'manual',
      notes: notes || '',
    })

    // Update customer stats & Nasiya CRM
    let customerDoc = await Customer.findOne({
      userId: req.user.id,
      name: { $regex: `^${escapeRegex(customer)}$`, $options: 'i' },
    })

    const isNasiya = paymentMethod === 'nasiya'

    if (customerDoc) {
      customerDoc.totalOrders += 1
      customerDoc.totalSpent += total
      customerDoc.lastOrderDate = new Date()
      if (isNasiya) {
        customerDoc.debt = (customerDoc.debt || 0) + total
        if (!customerDoc.debtDueDate) {
          customerDoc.debtDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        }
      }
      // Sodiqlik keshbeki (1%) va Tier yangilash
      customerDoc.cashback = (customerDoc.cashback || 0) + Math.round(total * 0.01)
      if (customerDoc.totalSpent >= 50000000) customerDoc.tier = 'Platinum'
      else if (customerDoc.totalSpent >= 20000000) customerDoc.tier = 'Gold'
      else if (customerDoc.totalSpent >= 5000000) customerDoc.tier = 'Silver'
      else customerDoc.tier = 'Bronze'
      await customerDoc.save()
    } else {
      // Yangi mijozni avtomatik yaratish
      try {
        let initialTier = 'Bronze'
        if (total >= 50000000) initialTier = 'Platinum'
        else if (total >= 20000000) initialTier = 'Gold'
        else if (total >= 5000000) initialTier = 'Silver'

        customerDoc = await Customer.create({
          userId: req.user.id,
          name: customer,
          phone: phone || '',
          totalOrders: 1,
          totalSpent: total,
          lastOrderDate: new Date(),
          debt: isNasiya ? total : 0,
          debtDueDate: isNasiya ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null,
          cashback: Math.round(total * 0.01),
          tier: initialTier,
          tags: isNasiya ? ['Nasiya'] : ['Yangi'],
        })
        await User.findByIdAndUpdate(req.user.id, { $inc: { totalCustomers: 1 } })
      } catch (_) {}
    }

    // Update user stats
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { totalOrders: 1, totalRevenue: total },
    })

    // Update product stock — stock >= qty sharti manfiy qoldiqning oldini oladi
    for (const item of items) {
      await Product.updateOne(
        { userId: req.user.id, name: item.name, stock: { $gte: item.qty } },
        { $inc: { stock: -item.qty } }
      )
    }

    // Send notification about new order
    try {
      const Notification = require('../models/Notification')
      await Notification.send({
        userId: req.user.id,
        type: 'new_order',
        title: 'Yangi buyurtma!',
        message: `${customer} dan ${total.toLocaleString()} somlik buyurtma keldi`,
        data: { orderId: order._id, total, source: source || 'manual' },
        urgent: true,
      })
    } catch (notifErr) {
      console.error('Notification send error:', notifErr)
    }

    res.status(201).json({ success: true, data: order })
  } catch (error) {
    console.error('Order create error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// PUT /api/orders/:id/status
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const { status, payment } = req.body

    // Enum'ni tekshirish (findOneAndUpdate default'da validator ishlatmaydi)
    if (status && !ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Notogri status' })
    }
    if (payment && !PAYMENT_STATUSES.includes(payment)) {
      return res.status(400).json({ success: false, message: 'Notogri tolov holati' })
    }

    const currentOrder = await Order.findOne({ _id: req.params.id, userId: req.user.id })
    if (!currentOrder) return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' })

    const oldStatus = currentOrder.status
    const newStatus = status || oldStatus

    // Stok boshqaruvi: bekor qilinsa omborga qaytarish, qayta faollashsa yana kamaytirish
    if (oldStatus !== 'cancelled' && newStatus === 'cancelled') {
      for (const item of (currentOrder.items || [])) {
        await Product.updateOne(
          { userId: req.user.id, name: item.name },
          { $inc: { stock: item.qty } }
        )
      }
    } else if (oldStatus === 'cancelled' && newStatus !== 'cancelled') {
      for (const item of (currentOrder.items || [])) {
        await Product.updateOne(
          { userId: req.user.id, name: item.name, stock: { $gte: item.qty } },
          { $inc: { stock: -item.qty } }
        )
      }
    }

    const update = {}
    if (status) update.status = status
    if (payment) update.payment = payment

    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: update },
      { new: true, runValidators: true }
    )

    res.json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// GET /api/orders/analytics - 7/30 kunlik tushum, foyda va kategoriya taqsimoti
router.get('/analytics', authenticate, async (req, res) => {
  try {
    const { range = '7d' } = req.query
    const days = range === '30d' ? 30 : 7
    const now = new Date()
    const startDate = new Date(now)
    startDate.setDate(now.getDate() - days + 1)
    startDate.setHours(0, 0, 0, 0)

    // Mahsulotlar tannarxini olish
    const userProducts = await Product.find({ userId: req.user.id }).select('name price cost category').lean()
    const productCostMap = {}
    userProducts.forEach(p => {
      productCostMap[p.name.toLowerCase()] = p.cost || 0
    })

    // Buyurtmalar
    const orders = await Order.find({
      userId: req.user.id,
      createdAt: { $gte: startDate },
      status: { $ne: 'cancelled' },
    }).select('total items createdAt customer paymentMethod').lean()

    // Kunlar bo'yicha guruhlash
    const dayMap = {}
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate)
      d.setDate(startDate.getDate() + i)
      const key = d.toLocaleDateString('uz-UZ', { weekday: 'short', month: 'numeric', day: 'numeric' })
      dayMap[key] = { day: key, tushum: 0, foyda: 0, buyurtmalar: 0 }
    }

    let totalPeriodRevenue = 0
    let totalPeriodCost = 0
    const topProductMap = {}

    for (const order of orders) {
      const d = new Date(order.createdAt)
      const key = d.toLocaleDateString('uz-UZ', { weekday: 'short', month: 'numeric', day: 'numeric' })
      let orderCost = 0

      for (const item of (order.items || [])) {
        const itemCost = (productCostMap[item.name.toLowerCase()] || (item.price * 0.7)) * item.qty
        orderCost += itemCost

        // Top products tracking
        if (!topProductMap[item.name]) {
          topProductMap[item.name] = { name: item.name, qty: 0, total: 0, category: item.category || 'Boshqa' }
        }
        topProductMap[item.name].qty += item.qty
        topProductMap[item.name].total += (item.price * item.qty)
      }

      const orderRevenue = order.total || 0
      const orderProfit = Math.max(0, orderRevenue - orderCost)
      totalPeriodRevenue += orderRevenue
      totalPeriodCost += orderCost

      if (dayMap[key]) {
        dayMap[key].tushum += orderRevenue
        dayMap[key].foyda += orderProfit
        dayMap[key].buyurtmalar += 1
      }
    }

    const chartData = Object.values(dayMap)
    const netProfit = Math.max(0, totalPeriodRevenue - totalPeriodCost)
    const profitMargin = totalPeriodRevenue > 0 ? Math.round((netProfit / totalPeriodRevenue) * 100) : 0

    // Top selling products
    const topProducts = Object.values(topProductMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)

    // Kategoriyalar bo'yicha sotuv
    const categoryMap = {}
    const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4']
    for (const order of orders) {
      for (const item of (order.items || [])) {
        const cat = item.category || 'Boshqa'
        categoryMap[cat] = (categoryMap[cat] || 0) + (item.price * item.qty)
      }
    }
    const totalSales = Object.values(categoryMap).reduce((a, b) => a + b, 0) || 1
    const categoryData = Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value], i) => ({
        name,
        value: Math.round((value / totalSales) * 100),
        color: COLORS[i % COLORS.length],
      }))

    // Soatlik buyurtmalar (bugun)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayOrders = await Order.find({
      userId: req.user.id,
      createdAt: { $gte: todayStart },
      status: { $ne: 'cancelled' },
    }).select('createdAt').lean()

    const hourBuckets = { '09:00': 0, '11:00': 0, '13:00': 0, '15:00': 0, '17:00': 0, '19:00': 0, '21:00': 0 }
    for (const ord of todayOrders) {
      const h = new Date(ord.createdAt).getHours()
      if (h < 10) hourBuckets['09:00']++
      else if (h < 12) hourBuckets['11:00']++
      else if (h < 14) hourBuckets['13:00']++
      else if (h < 16) hourBuckets['15:00']++
      else if (h < 18) hourBuckets['17:00']++
      else if (h < 20) hourBuckets['19:00']++
      else hourBuckets['21:00']++
    }
    const hourlyData = Object.entries(hourBuckets).map(([hour, orders]) => ({ hour, orders }))

    res.json({
      success: true,
      data: {
        chartData,
        categoryData,
        hourlyData,
        topProducts,
        totalPeriodRevenue,
        netProfit,
        profitMargin,
      },
    })
  } catch (error) {
    console.error('Analytics error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// DELETE /api/orders/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id, isActive: true },
      { $set: { isActive: false } },
      { new: true }
    )
    if (!order) return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' })

    // Agar buyurtma bekor qilinmagan bo'lsa, ombordagi qoldiqni tiklaymiz
    if (order.status !== 'cancelled') {
      for (const item of (order.items || [])) {
        await Product.updateOne(
          { userId: req.user.id, name: item.name },
          { $inc: { stock: item.qty } }
        )
      }
    }

    // Faqat haqiqatan o'chirilganda hisobni kamaytiramiz (double-delete drift oldini olish)
    await User.findByIdAndUpdate(req.user.id, { $inc: { totalOrders: -1, totalRevenue: -order.total } })
    
    res.json({ success: true, message: 'Buyurtma ochirildi' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

module.exports = router
