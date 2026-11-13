const crypto = require('crypto')
const express = require('express')
const router = express.Router()
const Product = require('../models/Product')
const User = require('../models/User')
const ShopProfile = require('../models/ShopProfile')
const { authenticate } = require('../middleware/auth')
const mongoose = require('mongoose')
const { safeSearchRegex } = require('../utils/sanitize')
const { getPublicShopIds } = require('../services/publicShops')

// GET /api/marketplace/shops - Barcha faol do'konlar (OsonBozor uchun)
router.get('/shops', async (req, res) => {
  try {
    const { city, category, search } = req.query

    // OsonBozorda ko'rsatish yoqilgan do'konlar
    const publicIds = await getPublicShopIds()
    const enabledProfiles = await ShopProfile.find({ userId: { $in: publicIds } }).lean()

    const enabledUserIds = enabledProfiles.map(p => p.userId.toString())
    const profileMap = {}
    enabledProfiles.forEach(p => { profileMap[p.userId.toString()] = p })

    let filter = { 
      role: 'shop_owner', 
      isActive: true,
      _id: { $in: enabledUserIds },
    }

    if (search) {
      filter.$or = [
        { business: safeSearchRegex(search) },
        { name: safeSearchRegex(search) },
      ]
    }

    const shops = await User.find(filter)
      .select('name business phone tariff totalProducts totalOrders isActive')
      .sort({ totalOrders: -1 })
      .lean()

    const enriched = shops.map(shop => {
      const profile = profileMap[shop._id.toString()] || {}
      return {
        _id: shop._id,
        name: shop.business || shop.name,
        ownerName: shop.name,
        phone: shop.phone,
        description: profile.description || '',
        address: profile.address || '',
        city: profile.city || '',
        latitude: profile.latitude || null,
        longitude: profile.longitude || null,
        rating: profile.reviewCount ? profile.rating : null,
        reviewCount: profile.reviewCount || 0,
        isVerified: profile.isVerified || false,
        showOnMarketplace: profile.showOnMarketplace || false,
        isFeatured: profile.isFeatured || false,
        categories: profile.categories || [],
        bannerColor: profile.bannerColor || 'from-emerald-600 to-emerald-800',
        botUsername: profile.botUsername || '',
        productCount: shop.totalProducts || 0,
        totalOrders: shop.totalOrders || 0,
        tariff: shop.tariff,
      }
    })

    // Filtrlash
    let result = enriched
    if (category) {
      result = result.filter(s =>
        s.categories.some(c => c.toLowerCase().includes(category.toLowerCase())) ||
        s.description.toLowerCase().includes(category.toLowerCase())
      )
    }

    res.json({
      success: true,
      data: result,
      total: result.length,
    })
  } catch (error) {
    console.error('Marketplace shops error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// GET /api/marketplace/shops/featured - Tavsiya etilgan do'konlar
router.get('/shops/featured', async (req, res) => {
  try {
    const featuredProfiles = await ShopProfile.find({
      userId: { $in: await getPublicShopIds() },
      isFeatured: true,
    }).populate('userId', 'name business phone tariff totalProducts totalOrders isActive').lean()

    // Har bir do'kon uchun 3 tagacha mahsulot rasmi (banner uchun)
    const ids = featuredProfiles.filter(p => p.userId).map(p => p.userId._id)
    const previews = await Product.aggregate([
      { $match: { userId: { $in: ids }, isActive: { $ne: false }, stock: { $gt: 0 }, 'images.0': { $exists: true } } },
      { $sort: { price: -1 } },
      { $group: { _id: '$userId', items: { $push: { _id: '$_id', name: '$name', price: '$price', image: { $arrayElemAt: ['$images', 0] } } } } },
      { $project: { items: { $slice: ['$items', 3] } } },
    ])
    const previewMap = new Map(previews.map(p => [p._id.toString(), p.items]))

    const shops = featuredProfiles
      .filter(p => p.userId && p.userId.isActive !== false)
      .map(p => ({
        previewProducts: previewMap.get(p.userId._id.toString()) || [],
        _id: p.userId._id,
        name: p.userId.business || p.userId.name,
        ownerName: p.userId.name,
        description: p.description || '',
        address: p.address || '',
        city: p.city || '',
        latitude: p.latitude || null,
        longitude: p.longitude || null,
        rating: p.reviewCount ? p.rating : null,
        reviewCount: p.reviewCount || 0,
        isVerified: p.isVerified || false,
        categories: p.categories || [],
        bannerColor: p.bannerColor || 'from-emerald-600 to-emerald-800',
        botUsername: p.botUsername || '',
        productCount: p.userId.totalProducts || 0,
        totalOrders: p.userId.totalOrders || 0,
        tariff: p.userId.tariff,
      }))

    res.json({ success: true, data: shops })
  } catch (error) {
    console.error('Featured shops error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// Ikki nuqta orasidagi masofa (km), haversine
function distanceKm(a, b) {
  if (!a || b?.latitude == null || b?.longitude == null) return null
  const R = 6371
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(b.latitude - a.lat)
  const dLng = rad(b.longitude - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10
}

// near = "41.31,69.27" — xaridorning joylashuvi (faqat masofa hisoblash uchun, saqlanmaydi)
function parseNear(raw) {
  const [lat, lng] = String(raw || '').split(',').map(Number)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat, lng }
}

function enrichProduct(p, profileMap, near) {
  const profile = profileMap[p.userId?._id?.toString()] || {}
  return {
    distanceKm: near ? distanceKm(near, profile) : undefined,
    createdAt: p.createdAt,
    _id: p._id,
    name: p.name,
    price: p.price,
    category: p.category,
    stock: p.stock,
    sku: p.sku,
    description: p.description,
    images: p.images || [],
    image: p.images?.[0] || '',
    shopId: p.userId?._id,
    shopName: p.userId?.business || p.userId?.name || "Do'kon",
    shopPhone: profile.phone || p.userId?.phone || '',
    shopAddress: profile.address || '',
    shopCity: profile.city || '',
    shopBotUsername: profile.botUsername || '',
  }
}

// interests = "soat:5,smartfon:2" (term:vazn), brauzerda saqlanadi — hech qanday shaxsiy ma'lumot emas
function parseInterests(raw) {
  if (typeof raw !== 'string' || !raw) return []
  return raw
    .split(',')
    .slice(0, 10)
    .map(part => {
      const [term, w] = part.split(':')
      return { term: String(term || '').trim().toLowerCase().slice(0, 40), weight: Math.min(10, Math.max(1, parseInt(w) || 1)) }
    })
    .filter(i => i.term.length >= 2)
}

// Seed'ga bog'liq barqaror tasodif (sahifalashda tartib buzilmasin)
function seededRand(seed, id) {
  const h = crypto.createHash('md5').update(seed + ':' + id).digest()
  return h.readUInt32BE(0) / 0xffffffff
}

// O'zbekcha/ruscha qidiruv so'zlari ↔ mahsulot nomlaridagi inglizcha so'zlar
const SYNONYMS = {
  soat: ['watch', 'soat', 'часы'], 'часы': ['watch', 'soat'],
  telefon: ['phone', 'smartfon', 'iphone', 'redmi'], smartfon: ['phone', 'smartfon', 'iphone', 'redmi'],
  quloqchin: ['airpods', 'headphone', 'jbl', 'quloqchin', 'наушники'], 'наушники': ['airpods', 'headphone', 'jbl'],
  noutbuk: ['macbook', 'laptop', 'noutbuk', 'ноутбук'], 'ноутбук': ['macbook', 'laptop', 'noutbuk'],
  planshet: ['ipad', 'tab', 'planshet', 'планшет'],
}
const expandTerm = term => SYNONYMS[term] || [term]

function rankForYou(items, { seed, interests }) {
  const s = seed || new Date().toISOString().slice(0, 10) // seed yo'q bo'lsa — kunlik aylanish
  const scored = items.map(it => {
    const hay = `${it.name || ''} ${it.category || ''}`.toLowerCase()
    let score = seededRand(s, it._id.toString())
    for (const { term, weight } of interests) {
      if (expandTerm(term).some(t => hay.includes(t))) score += 2 + weight
    }
    return { ...it, shop: it.userId?.toString(), score }
  })
  scored.sort((a, b) => b.score - a.score)
  // Ketma-ket bir do'kon chiqmasin: navbatdagi eng yuqori, lekin oldingisidan boshqa do'kondan
  const out = []
  const pool = scored
  let last = null
  while (pool.length) {
    let idx = pool.findIndex(p => p.shop !== last)
    if (idx === -1 || idx > 6) idx = 0
    const [picked] = pool.splice(idx, 1)
    out.push(picked)
    last = picked.shop
  }
  return out
}

// GET /api/marketplace/products - Barcha mahsulotlar (faqat OsonBozorda ko'rinadigan do'konlardan)
router.get('/products', async (req, res) => {
  try {
    const { search, category, shopId, sort, page = 1, limit = 20 } = req.query

    // Faqat OsonBozorda ko'rinadigan do'konlarning userId larini olish
    const enabledShops = await ShopProfile.find({
      userId: { $in: await getPublicShopIds() },
    }).lean()
    const enabledUserIds = enabledShops.map(s => s.userId.toString())
    // Build profileMap for address/phone info
    const profileMap = {}
    enabledShops.forEach(p => { profileMap[p.userId.toString()] = p })

    if (shopId && !mongoose.isValidObjectId(shopId)) {
      return res.json({ success: true, data: [], total: 0, page: 1, totalPages: 0 })
    }
    const pageNum = Math.max(1, parseInt(page) || 1)
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20))

    if (shopId) {
      // Agar ma'lum do'kon so'ralgan bo'lsa, u ham OsonBozorda ko'rinishini tekshirish
      if (!enabledUserIds.includes(shopId)) {
        return res.json({ success: true, data: [], total: 0, page: 1, totalPages: 0 })
      }
    }

    let filter = { 
      isActive: { $ne: false }, 
      stock: { $gt: 0 },
      userId: { $in: enabledUserIds },
    }

    if (shopId) filter.userId = shopId
    // Shahar bo'yicha (OLX/Uzum kabi): faqat shu shahardagi do'konlar
    const city = String(req.query.city || '').trim()
    if (city && !shopId) {
      filter.userId = { $in: enabledUserIds.filter(id => (profileMap[id]?.city || '').toLowerCase() === city.toLowerCase()) }
    }
    // Narx oralig'i
    const minP = Number(req.query.minPrice)
    const maxP = Number(req.query.maxPrice)
    if (Number.isFinite(minP) && minP > 0) filter.price = { ...(filter.price || {}), $gte: minP }
    if (Number.isFinite(maxP) && maxP > 0) filter.price = { ...(filter.price || {}), $lte: maxP }
    const near = parseNear(req.query.near)
    if (category) filter.category = safeSearchRegex(category)
    if (search) {
      // "soat" deb qidirsa "Watch" ham topilsin
      const terms = [...new Set([String(search), ...expandTerm(String(search).trim().toLowerCase())])].slice(0, 8)
      filter.$or = terms.flatMap(t => [{ name: safeSearchRegex(t) }, { category: safeSearchRegex(t) }])
    }

    let sortOption = { createdAt: -1 }
    if (sort === 'price_asc') sortOption = { price: 1 }
    else if (sort === 'price_desc') sortOption = { price: -1 }
    else if (sort === 'name') sortOption = { name: 1 }

    const skip = (pageNum - 1) * limitNum

    // "Yaqinimda": do'kon masofasi bo'yicha (koordinatasi yo'q do'konlar oxirida)
    if (sort === 'nearest' && near) {
      const candidates = await Product.find(filter).select('_id userId createdAt').sort({ createdAt: -1 }).limit(3000).lean()
      const dist = (c) => distanceKm(near, profileMap[c.userId.toString()]) ?? Infinity
      candidates.sort((a, b) => dist(a) - dist(b))
      const pageIds = candidates.slice(skip, skip + limitNum).map(c => c._id)
      const docs = await Product.find({ _id: { $in: pageIds } })
        .populate('userId', 'name business phone')
        .select('name price category stock sku description images userId createdAt')
        .lean()
      const byId = new Map(docs.map(d => [d._id.toString(), d]))
      return res.json({
        success: true,
        data: pageIds.map(id => byId.get(id.toString())).filter(Boolean).map(p => enrichProduct(p, profileMap, near)),
        total: candidates.length,
        page: pageNum,
        totalPages: Math.ceil(candidates.length / limitNum),
      })
    }

    // "Siz uchun": qiziqishlar bo'yicha yuqoriga + do'konlar aralash + har sessiyada boshqacha tartib
    if (!sort || sort === 'recommended') {
      const candidates = await Product.find(filter)
        .select('_id userId name category createdAt')
        .sort({ createdAt: -1 })
        .limit(3000)
        .lean()
      const ordered = rankForYou(candidates, {
        seed: String(req.query.seed || '').slice(0, 32),
        interests: parseInterests(req.query.interests),
      })
      const pageIds = ordered.slice(skip, skip + limitNum).map(c => c._id)
      const docs = await Product.find({ _id: { $in: pageIds } })
        .populate('userId', 'name business phone')
        .select('name price category stock sku description images userId createdAt')
        .lean()
      const byId = new Map(docs.map(d => [d._id.toString(), d]))
      const products = pageIds.map(id => byId.get(id.toString())).filter(Boolean)
      return res.json({
        success: true,
        data: products.map(p => enrichProduct(p, profileMap, near)),
        total: ordered.length,
        page: pageNum,
        totalPages: Math.ceil(ordered.length / limitNum),
      })
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('userId', 'name business phone')
        .select('name price category stock sku description images userId createdAt')
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(filter),
    ])

    const enriched = products.map(p => enrichProduct(p, profileMap, near))

    res.json({
      success: true,
      data: enriched,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    })
  } catch (error) {
    console.error('Marketplace products error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// GET /api/marketplace/products/:id - Mahsulot sahifasi: to'liq ma'lumot, do'kon, o'xshashlar
router.get('/products/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Mahsulot topilmadi' })
    }
    const publicIds = await getPublicShopIds()
    const product = await Product.findOne({
      _id: req.params.id,
      isActive: { $ne: false },
      userId: { $in: publicIds },
    })
      .populate('userId', 'name business phone')
      .select('name price category stock sku description images userId createdAt')
      .lean()
    if (!product) return res.status(404).json({ success: false, message: 'Mahsulot topilmadi' })

    const ownerId = product.userId._id
    const profile = await ShopProfile.findOne({ userId: ownerId }).lean()
    const profileMap = { [ownerId.toString()]: profile || {} }

    const base = { isActive: { $ne: false }, stock: { $gt: 0 }, _id: { $ne: product._id } }
    const [similarRaw, fromShopRaw, shopProductCount] = await Promise.all([
      Product.find({ ...base, category: product.category, userId: { $in: publicIds } })
        .populate('userId', 'name business phone')
        .select('name price category stock images userId')
        .limit(40)
        .lean(),
      Product.find({ ...base, userId: ownerId })
        .populate('userId', 'name business phone')
        .select('name price category stock images userId')
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      Product.countDocuments({ userId: ownerId, isActive: { $ne: false }, stock: { $gt: 0 } }),
    ])

    // O'xshashlar: narxi yaqinlari birinchi, do'konlar aralash
    const similarProfiles = await ShopProfile.find({ userId: { $in: [...new Set(similarRaw.map(p => p.userId?._id?.toString()))] } }).lean()
    similarProfiles.forEach(p => { profileMap[p.userId.toString()] = p })
    const similar = similarRaw
      .sort((a, b) => Math.abs(a.price - product.price) - Math.abs(b.price - product.price))
      .slice(0, 12)
      .map(p => enrichProduct(p, profileMap))

    res.json({
      success: true,
      data: {
        product: { ...enrichProduct(product, profileMap), createdAt: product.createdAt },
        shop: {
          _id: ownerId,
          name: product.userId.business || product.userId.name,
          description: profile?.description || '',
          address: profile?.address || '',
          city: profile?.city || '',
          phone: profile?.phone || product.userId.phone || '',
          latitude: profile?.latitude ?? null,
          longitude: profile?.longitude ?? null,
          botUsername: profile?.botUsername || '',
          isVerified: !!profile?.isVerified,
          rating: profile?.reviewCount ? profile.rating : null,
          productCount: shopProductCount,
        },
        similar,
        fromShop: fromShopRaw.map(p => enrichProduct(p, profileMap)),
      },
    })
  } catch (error) {
    console.error('Marketplace product detail error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// GET /api/marketplace/categories - Barcha kategoriyalar
// GET /api/marketplace/cities - do'konlari bor shaharlar (shahar tanlash uchun)
router.get('/cities', async (req, res) => {
  try {
    const grouped = await ShopProfile.aggregate([
      { $match: { userId: { $in: await getPublicShopIds() }, city: { $nin: [null, ''] } } },
      { $group: { _id: '$city', shops: { $sum: 1 } } },
      { $sort: { shops: -1 } },
    ])
    res.json({ success: true, data: grouped.map(g => ({ name: g._id, shops: g.shops })) })
  } catch (error) {
    console.error('Cities error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

router.get('/categories', async (req, res) => {
  try {
    // Faqat OsonBozorda ko'rinadigan do'konlar kategoriyalari (yashirin do'konlar sizib chiqmasin)
    const publicIds = await getPublicShopIds()
    const grouped = await Product.aggregate([
      { $match: { userId: { $in: publicIds }, isActive: { $ne: false }, stock: { $gt: 0 } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$category', count: { $sum: 1 }, minPrice: { $min: '$price' }, shops: { $addToSet: '$userId' }, imgs: { $push: { $arrayElemAt: ['$images', 0] } } } },
      { $sort: { count: -1 } },
    ])
    const categoryCounts = grouped.map(g => ({
      name: g._id,
      count: g.count,
      minPrice: g.minPrice,
      shopCount: (g.shops || []).length,
      images: (g.imgs || []).filter(Boolean).slice(0, 4),
      image: (g.imgs || []).find(Boolean) || null,
    }))

    res.json({ success: true, data: categoryCounts })
  } catch (error) {
    console.error('Categories error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// GET /api/marketplace/stats - Bosh sahifa statistikasi
router.get('/stats', async (req, res) => {
  try {
    // Faqat OsonBozorda ko'rinadigan do'konlar
    const enabledIds = await getPublicShopIds()

    const [totalProducts, featuredShops] = await Promise.all([
      Product.countDocuments({ isActive: { $ne: false }, userId: { $in: enabledIds } }),
      ShopProfile.countDocuments({ userId: { $in: enabledIds }, isFeatured: true }),
    ])
    const totalShops = enabledIds.length

    // Kategoriyalar soni
    const categories = await Product.distinct('category', {
      isActive: { $ne: false },
      userId: { $in: enabledIds },
    })

    res.json({
      success: true,
      data: {
        totalShops,
        totalProducts,
        featuredShops,
        totalCategories: categories.length,
      },
    })
  } catch (error) {
    console.error('Marketplace stats error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// PUT /api/marketplace/profile - Do'kon profilini yangilash (auth required)
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { description, address, city, showOnMarketplace, categories, botUsername, bannerColor, latitude, longitude } = req.body
    const userId = req.user.id

    let profile = await ShopProfile.findOne({ userId })
    if (!profile) {
      profile = new ShopProfile({ userId })
    }

    if (categories !== undefined && (!Array.isArray(categories) || categories.length > 20 || categories.some(c => typeof c !== 'string'))) {
      return res.status(400).json({ success: false, message: "Kategoriyalar ro'yxati noto'g'ri" })
    }
    // bannerColor className sifatida ishlatiladi — faqat Tailwind gradient formatiga ruxsat
    if (bannerColor !== undefined && !/^from-[a-z]+-\d{2,3} to-[a-z]+-\d{2,3}$/.test(bannerColor)) {
      return res.status(400).json({ success: false, message: "Banner rangi noto'g'ri" })
    }
    if (botUsername !== undefined && botUsername !== '' && !/^@?[A-Za-z0-9_]{5,32}$/.test(botUsername)) {
      return res.status(400).json({ success: false, message: "Bot username noto'g'ri" })
    }
    for (const [k, v] of [['latitude', latitude], ['longitude', longitude]]) {
      if (v !== undefined && v !== null && !Number.isFinite(Number(v))) {
        return res.status(400).json({ success: false, message: `${k} noto'g'ri` })
      }
    }

    if (description !== undefined) profile.description = String(description).slice(0, 1000)
    if (address !== undefined) profile.address = address
    if (city !== undefined) profile.city = city
    if (showOnMarketplace !== undefined) profile.showOnMarketplace = Boolean(showOnMarketplace)
    if (categories !== undefined) profile.categories = categories
    if (botUsername !== undefined) profile.botUsername = botUsername
    if (bannerColor !== undefined) profile.bannerColor = bannerColor
    if (latitude !== undefined) profile.latitude = latitude
    if (longitude !== undefined) profile.longitude = longitude

    // Product count
    if (showOnMarketplace) {
      profile.productCount = await Product.countDocuments({ userId, isActive: { $ne: false } })
    }

    await profile.save()

    res.json({
      success: true,
      data: profile,
      message: showOnMarketplace
        ? 'Do\'koningiz OsonBozorda ko\'rsatiladi!'
        : 'Do\'koningiz OsonBozordan yashirildi.',
    })
  } catch (error) {
    console.error('Marketplace profile update error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// GET /api/marketplace/profile - Do'kon profilini olish (auth required)
router.get('/profile', authenticate, async (req, res) => {
  try {
    let profile = await ShopProfile.findOne({ userId: req.user.id }).lean()
    if (!profile) {
      profile = {
        userId: req.user.id,
        showOnMarketplace: false,
        description: '',
        address: '',
        city: '',
        latitude: null,
        longitude: null,
        categories: [],
        botUsername: '',
        bannerColor: 'from-emerald-600 to-emerald-800',
        isVerified: false,
        isFeatured: false,
        rating: null,
        productCount: 0,
      }
    }

    res.json({ success: true, data: profile })
  } catch (error) {
    console.error('Marketplace profile get error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// GET /api/marketplace/shop/:userId - Do'kon ma'lumoti (public)
router.get('/shop/:userId', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) {
      return res.status(404).json({ success: false, message: 'Do\'kon topilmadi' })
    }
    // Faqat OsonBozorda ko'rinishni o'zi yoqqan do'kon ochiq ko'rinadi
    const isPublic = (await getPublicShopIds()).some(id => id.equals(req.params.userId))
    const profile = isPublic && await ShopProfile.findOne({ userId: req.params.userId }).lean()
    const user = profile && await User.findOne({ _id: req.params.userId, role: 'shop_owner', isActive: true })
      .select('name business phone tariff totalOrders')
      .lean()

    if (!user) {
      return res.status(404).json({ success: false, message: 'Do\'kon topilmadi' })
    }

    const products = await Product.find({
      userId: req.params.userId,
      isActive: { $ne: false },
      stock: { $gt: 0 },
    }).select('name price category stock sku description image images').sort({ createdAt: -1 }).limit(30).lean()

    res.json({
      success: true,
      data: {
        shop: {
          _id: user._id,
          name: user.business || user.name,
          ownerName: user.name,
          phone: user.phone,
          description: profile?.description || '',
          address: profile?.address || '',
          city: profile?.city || '',
          latitude: profile?.latitude || null,
          longitude: profile?.longitude || null,
          rating: profile?.reviewCount ? profile.rating : null,
          reviewCount: profile?.reviewCount || 0,
          isVerified: profile?.isVerified || false,
          categories: profile?.categories || [],
          bannerColor: profile?.bannerColor || 'from-emerald-600 to-emerald-800',
          botUsername: profile?.botUsername || '',
          productCount: products.length,
          totalOrders: user.totalOrders || 0,
          tariff: user.tariff,
        },
        products,
      },
    })
  } catch (error) {
    console.error('Marketplace shop detail error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

module.exports = router
