const express = require('express')
const router = express.Router()
const Product = require('../models/Product')
const User = require('../models/User')
const ShopProfile = require('../models/ShopProfile')
const { authenticate } = require('../middleware/auth')
const { safeSearchRegex } = require('../utils/sanitize')

// GET /api/marketplace/shops - Barcha faol do'konlar (OsonBozor uchun)
router.get('/shops', async (req, res) => {
  try {
    const { city, category, search } = req.query

    // OsonBozorda ko'rsatish yoqilgan do'konlar
    const enabledProfiles = await ShopProfile.find({
      showOnMarketplace: true,
    }).lean()

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
      .select('name business email phone tariff totalProducts totalOrders totalCustomers isActive')
      .sort({ totalOrders: -1 })
      .lean()

    const enriched = shops.map(shop => {
      const profile = profileMap[shop._id.toString()] || {}
      return {
        _id: shop._id,
        name: shop.business || shop.name,
        ownerName: shop.name,
        email: shop.email,
        phone: shop.phone,
        description: profile.description || '',
        address: profile.address || '',
        city: profile.city || '',
        latitude: profile.latitude || null,
        longitude: profile.longitude || null,
        rating: profile.rating || 5.0,
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
      showOnMarketplace: true,
      isFeatured: true,
    }).populate('userId', 'name business email phone description tariff totalProducts totalOrders').lean()

    const shops = featuredProfiles
      .filter(p => p.userId && p.userId.isActive !== false)
      .map(p => ({
        _id: p.userId._id,
        name: p.userId.business || p.userId.name,
        ownerName: p.userId.name,
        description: p.description || p.userId.description || '',
        address: p.address || '',
        city: p.city || '',
        latitude: p.latitude || null,
        longitude: p.longitude || null,
        rating: p.rating || 5.0,
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

// GET /api/marketplace/products - Barcha mahsulotlar (faqat OsonBozorda ko'rinadigan do'konlardan)
router.get('/products', async (req, res) => {
  try {
    const { search, category, shopId, sort, page = 1, limit = 20 } = req.query

    // Faqat OsonBozorda ko'rinadigan do'konlarning userId larini olish
    const enabledShops = await ShopProfile.find({
      showOnMarketplace: true,
    }).lean()
    const enabledUserIds = enabledShops.map(s => s.userId.toString())
    // Build profileMap for address/phone info
    const profileMap = {}
    enabledShops.forEach(p => { profileMap[p.userId.toString()] = p })

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
    if (category) filter.category = safeSearchRegex(category)
    if (search) filter.name = safeSearchRegex(search)

    let sortOption = { createdAt: -1 }
    if (sort === 'price_asc') sortOption = { price: 1 }
    else if (sort === 'price_desc') sortOption = { price: -1 }
    else if (sort === 'name') sortOption = { name: 1 }

    const skip = (parseInt(page) - 1) * parseInt(limit)

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('userId', 'name business phone')
        .select('name price category stock sku description images userId')
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Product.countDocuments(filter),
    ])

    const enriched = products.map(p => {
      const profile = profileMap[p.userId?._id?.toString()] || {}
      return {
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
        shopName: p.userId?.business || p.userId?.name || 'Do\'kon',
        shopPhone: profile.phone || p.userId?.phone || '',
        shopAddress: profile.address || '',
        shopCity: profile.city || '',
        shopBotUsername: profile.botUsername || '',
      }
    })

    res.json({
      success: true,
      data: enriched,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    })
  } catch (error) {
    console.error('Marketplace products error:', error)
    res.status(500).json({ success: false, message: 'Server xatoligi' })
  }
})

// GET /api/marketplace/categories - Barcha kategoriyalar
router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.distinct('category', { isActive: { $ne: false } })
    const categoryCounts = await Promise.all(
      categories.map(async (cat) => {
        const count = await Product.countDocuments({ category: cat, isActive: { $ne: false }, stock: { $gt: 0 } })
        return { name: cat, count }
      })
    )
    categoryCounts.sort((a, b) => b.count - a.count)

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
    const enabledShops = await ShopProfile.find({ showOnMarketplace: true }).select('userId').lean()
    const enabledIds = enabledShops.map(s => s.userId.toString())

    const [totalShops, totalProducts, featuredShops] = await Promise.all([
      User.countDocuments({ role: 'shop_owner', isActive: true, _id: { $in: enabledIds } }),
      Product.countDocuments({ isActive: { $ne: false }, userId: { $in: enabledIds } }),
      ShopProfile.countDocuments({ showOnMarketplace: true, isFeatured: true }),
    ])

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

    if (description !== undefined) profile.description = description
    if (address !== undefined) profile.address = address
    if (city !== undefined) profile.city = city
    if (showOnMarketplace !== undefined) profile.showOnMarketplace = showOnMarketplace
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
        rating: 5.0,
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
    const user = await User.findById(req.params.userId)
      .select('name business email phone description tariff totalProducts totalOrders totalCustomers')
      .lean()

    if (!user) {
      return res.status(404).json({ success: false, message: 'Do\'kon topilmadi' })
    }

    const profile = await ShopProfile.findOne({ userId: req.params.userId }).lean()

    const products = await Product.find({
      userId: req.params.userId,
      isActive: { $ne: false },
      stock: { $gt: 0 },
    }).select('name price category stock sku description image').sort({ createdAt: -1 }).limit(30).lean()

    res.json({
      success: true,
      data: {
        shop: {
          _id: user._id,
          name: user.business || user.name,
          ownerName: user.name,
          phone: user.phone,
          email: user.email,
          description: profile?.description || user.description || '',
          address: profile?.address || '',
          city: profile?.city || '',
          latitude: profile?.latitude || null,
          longitude: profile?.longitude || null,
          rating: profile?.rating || 5.0,
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
