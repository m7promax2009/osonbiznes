import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Search, ShoppingBag, Store, Star, MapPin,
  Package, ArrowRight, MessageSquare,
  X, Menu, LogIn, UserPlus, Grid, Home, Truck,
  Phone, User, CheckCircle2, AlertCircle, Send,
  ChevronLeft, ChevronRight, ChevronDown, ExternalLink,
  ArrowUpDown, Sparkles,
} from 'lucide-react'
import api, { resolveImageUrl } from '../services/api'
import LanguageSwitcher from '../components/LanguageSwitcher'
import SupportModal from '../components/SupportModal'
import MarketplaceCartModal from '../components/MarketplaceCartModal'
import sounds from '../utils/audio'
import { toast } from '../components/Toast'

const CATEGORY_EMOJIS = {
  'Smartfonlar': '📱', 'Noutbuklar': '💻', 'Kompyuterlar': '🖥️',
  'Aksessuarlar': '🎧', 'Soatlar': '⌚', 'Kameralar': '📷',
  "O'yinlar": '🎮', 'Kiyimlar': '👕', 'Uy jihozlari': '🏠',
  'Planshetlar': '📟', 'Televizorlar': '📺', 'Boshqa': '📦',
}

const PRODUCTS_PER_PAGE = 24

function formatPrice(p) {
  return new Intl.NumberFormat('uz-UZ').format(p || 0) + " so'm"
}

export default function OsonBozor() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [shops, setShops] = useState([])
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [featuredShops, setFeaturedShops] = useState([])
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [totalProducts, setTotalProducts] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showSupport, setShowSupport] = useState(false)
  const [error, setError] = useState('')

  // Global Shopping Cart State
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('osonbozor_cart') || '[]')
    } catch (_) { return [] }
  })
  const [showCartModal, setShowCartModal] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem('osonbozor_cart', JSON.stringify(cart))
    } catch (_) {}
  }, [cart])

  const addToCart = (product, shop, qty = 1) => {
    sounds.playCashChing()
    setCart(prev => {
      const existing = prev.find(i => (i.productId || i._id) === product._id)
      if (existing) {
        return prev.map(i => (i.productId || i._id) === product._id ? { ...i, qty: i.qty + qty } : i)
      }
      return [...prev, {
        productId: product._id,
        _id: product._id,
        name: product.name,
        price: product.price,
        stock: product.stock,
        images: product.images,
        category: product.category,
        shopId: shop?._id || product.shopId,
        shopName: shop?.name || product.shopName,
        qty,
      }]
    })
    toast.success(`"${product.name}" savatga qo'shildi! 🛒`)
  }

  const updateCartQty = (productId, delta) => {
    sounds.playClick()
    setCart(prev => prev.map(i => {
      if ((i.productId || i._id) === productId) {
        const newQty = i.qty + delta
        return newQty > 0 ? { ...i, qty: newQty } : null
      }
      return i
    }).filter(Boolean))
  }

  const removeFromCart = (productId) => {
    sounds.playClick()
    setCart(prev => prev.filter(i => (i.productId || i._id) !== productId))
    toast.info("Mahsulot savatdan o'chirildi")
  }

  const clearCart = () => {
    setCart([])
  }

  // Order modal
  const [orderModal, setOrderModal] = useState({ open: false, shop: null, product: null })
  const [orderForm, setOrderForm] = useState({ customer: '', phone: '', address: '', deliveryMethod: 'pickup' })
  const [orderLoading, setOrderLoading] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(null)
  const [orderError, setOrderError] = useState('')

  // Product detail modal
  const [productModal, setProductModal] = useState(null)
  const [galleryIdx, setGalleryIdx] = useState(0)

  // Map modal (Do'konlar xaritasi)
  const [showMap, setShowMap] = useState(false)

  // --- Ma'lumotlar 100% backenddan yuklanadi (soxta data yo'q) ---
  // Eski (kechikkan) javoblar yangi ma'lumotni ustiga yozib qo'ymasligi uchun so'rov ID
  const reqRef = React.useRef(0)

  const fetchData = useCallback(async () => {
    const reqId = ++reqRef.current
    try {
      setLoading(true)
      setError('')
      const params = { limit: PRODUCTS_PER_PAGE, page: 1 }
      if (sort !== 'newest') params.sort = sort
      if (selectedCategory) params.category = selectedCategory
      const query = searchQuery.trim()
      if (query) params.search = query

      const [shopsRes, prodRes, catRes, statsRes, featRes] = await Promise.all([
        api.getMarketplaceShops(query ? { search: query } : {}),
        api.getMarketplaceProducts(params),
        api.getMarketplaceCategories(),
        api.getMarketplaceStats(),
        api.getFeaturedShops().catch(() => []),
      ])
      if (reqId !== reqRef.current) return // eskirgan javob — bekor qilamiz
      setShops(shopsRes.data || [])
      setProducts(prodRes.data || [])
      setTotalProducts(prodRes.total || 0)
      setHasMore((prodRes.page || 1) < (prodRes.totalPages || 1))
      setCategories(catRes || [])
      setStats(statsRes)
      setFeaturedShops(Array.isArray(featRes) ? featRes : [])
      setPage(1)
    } catch (err) {
      if (reqId !== reqRef.current) return
      setError(err.message)
    } finally {
      if (reqId === reqRef.current) setLoading(false)
    }
  }, [sort, selectedCategory, searchQuery])

  useEffect(() => { fetchData() }, [fetchData])

  // --- Qidiruv (debounced) ---
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 450)
    return () => clearTimeout(t)
  }, [searchInput])

  const handleSearch = (e) => {
    e?.preventDefault()
    setSearchQuery(searchInput.trim())
  }

  const handleCategoryClick = (catName) => {
    setSelectedCategory(catName === selectedCategory ? '' : catName)
  }

  const handleSortChange = (e) => {
    setSort(e.target.value)
  }

  const handleReset = () => {
    setSearchInput('')
    setSearchQuery('')
    setSelectedCategory('')
    setSort('newest')
  }

  const loadMore = async () => {
    if (loadingMore) return
    const reqId = ++reqRef.current
    const nextPage = page + 1
    try {
      setLoadingMore(true)
      const params = { limit: PRODUCTS_PER_PAGE, page: nextPage }
      if (sort !== 'newest') params.sort = sort
      if (selectedCategory) params.category = selectedCategory
      const query = searchQuery.trim()
      if (query) params.search = query
      const res = await api.getMarketplaceProducts(params)
      if (reqId !== reqRef.current) return
      setProducts(prev => [...prev, ...(res.data || [])])
      setPage(nextPage)
      setHasMore(nextPage < (res.totalPages || 1))
    } catch (err) {
      if (reqId !== reqRef.current) return
      setError(err.message)
    } finally {
      if (reqId === reqRef.current) setLoadingMore(false)
    }
  }

  const handleShopTelegram = (shop) => {
    const bot = shop.botUsername || 'OSSON_BIZNES_BOT'
    window.open(`https://t.me/${bot.replace('@', '')}`, '_blank')
  }

  // --- Product detail modal ---
  const openProductModal = (product) => {
    setProductModal(product)
    setGalleryIdx(0)
  }

  const closeProductModal = () => {
    setProductModal(null)
    setGalleryIdx(0)
  }

  // --- Order functions ---
  const openOrderModal = (shop, product = null) => {
    setOrderModal({ open: true, shop, product })
    setOrderForm({ customer: '', phone: '', address: '', deliveryMethod: 'pickup' })
    setOrderSuccess(null)
    setOrderError('')
  }

  const closeOrderModal = () => {
    setOrderModal({ open: false, shop: null, product: null })
    setOrderSuccess(null)
    setOrderError('')
  }

  const handlePlaceOrder = async (e) => {
    e.preventDefault()
    setOrderError('')
    if (!orderForm.customer.trim() || !orderForm.phone.trim()) {
      setOrderError(t('marketplace.error_name_phone'))
      return
    }
    if (orderForm.phone.trim().length < 7) {
      setOrderError(t('marketplace.error_phone_format'))
      return
    }
    setOrderLoading(true)
    try {
      const items = orderModal.product
        ? [{ name: orderModal.product.name, qty: 1, price: orderModal.product.price, productId: orderModal.product._id }]
        : [{ name: `Buyurtma: ${orderModal.shop?.name || "Do'kon"}`, qty: 1, price: 0 }]

      const total = items.reduce((s, i) => s + (i.price * i.qty), 0)

      const data = await api.request('/telegram/order', {
        method: 'POST',
        body: {
          customer: orderForm.customer.trim(),
          phone: orderForm.phone.trim(),
          items,
          total,
          source: 'website',
          ownerId: orderModal.shop._id,
          address: orderForm.address.trim(),
          deliveryMethod: orderForm.deliveryMethod,
        },
      })

      setOrderSuccess({
        message: data.message || '✅ Buyurtma qabul qilindi!',
        orderId: data.data?.orderNumber || data.data?.orderId,
      })
    } catch (err) {
      setOrderError(err.message || 'Serverga ulanishda xatolik')
    } finally {
      setOrderLoading(false)
    }
  }

  // Modal ochiq paytida fon scroll bo'lmasligi uchun
  useEffect(() => {
    const locked = !!productModal || showMap || orderModal.open
    document.body.style.overflow = locked ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [productModal, showMap, orderModal.open])

  // Marketplace doimo yorug' ko'rinishda bo'ladi (dark mode'da buzilmasligi uchun)
  useEffect(() => {
    const html = document.documentElement
    const hadDark = html.classList.contains('dark')
    html.classList.remove('dark')
    return () => {
      if (hadDark) html.classList.add('dark')
    }
  }, [])

  // --- Loading ---
  if (loading && !products.length) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <img src="/images/marketplace-logo.png" alt="OsonBozor" width="2400" height="800" className="h-12 w-auto mx-auto mb-6 animate-pulse" />
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm mt-4">{t('marketplace.loading')}</p>
        </div>
      </div>
    )
  }

  const productImages = (p) => p.images?.length > 0 ? p.images : (p.image ? [p.image] : [])

  return (
    <div className="min-h-screen bg-slate-50 marketplace-page">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-emerald-600 focus:text-white focus:rounded-lg focus:text-sm"
      >
        Asosiy kontentga o'tish
      </a>

      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top row: logo + search + actions */}
          <div className="flex items-center justify-between gap-3 h-16">
            {/* Logo + tagline - bosh sahifaga o'tkazmaydi, scroll-to-top */}
            <button
              onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setShowMobileMenu(false) }}
              className="flex items-center gap-2.5 shrink-0 group"
              aria-label="OsonBozor"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <Store className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="leading-tight hidden sm:block">
                <span className="block text-base font-extrabold text-slate-900 tracking-tight">
                  Oson<span className="text-emerald-600">Bozor</span>
                </span>
                <span className="block text-[10px] text-slate-500 mt-0.5 truncate max-w-[220px]">{t('marketplace.tagline')}</span>
              </div>
            </button>

            {/* Search - desktop */}
            <form onSubmit={handleSearch} role="search" className="hidden md:flex flex-1 max-w-xl mx-4">
              <div className="flex w-full items-center border-2 border-emerald-500 rounded-full bg-white overflow-hidden focus-within:ring-2 focus-within:ring-emerald-200 transition">
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder={t('marketplace.search')}
                  aria-label={t('marketplace.search')}
                  className="flex-1 px-4 py-2.5 text-sm bg-transparent outline-none min-w-0 text-slate-900 placeholder:text-slate-400"
                />
                <button type="submit" className="shrink-0 m-1 px-4 py-1.5 bg-emerald-600 text-white rounded-full text-sm font-medium hover:bg-emerald-700 transition flex items-center gap-1.5">
                  <Search className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden lg:inline">{t('marketplace.search_btn')}</span>
                </button>
              </div>
            </form>

            {/* Right actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Shopping Cart Button */}
              <button
                onClick={() => {
                  sounds.playClick()
                  setShowCartModal(true)
                }}
                className="relative flex items-center gap-2 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold transition border border-emerald-200 shadow-xs"
                title="Xarid savatini ochish"
              >
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">Savat</span>
                {cart.length > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 bg-emerald-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center animate-scale-in">
                    {cart.reduce((s, i) => s + i.qty, 0)}
                  </span>
                )}
              </button>

              <div className="hidden sm:block"><LanguageSwitcher dropdown /></div>
              <a href="/login?redirect=/marketplace" className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 border-2 border-emerald-500 text-emerald-700 rounded-full text-sm font-medium hover:bg-emerald-50 transition">
                <LogIn className="w-4 h-4" aria-hidden="true" />
                {t('marketplace.login')}
              </a>
              <a href="/login?register=1&redirect=/marketplace" className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-full text-sm font-semibold hover:bg-emerald-700 transition shadow-sm">
                <UserPlus className="w-4 h-4" aria-hidden="true" />
                {t('marketplace.register')}
              </a>
              <button onClick={() => setShowMobileMenu(!showMobileMenu)} aria-label="Menyuni ochish" aria-expanded={showMobileMenu} className="md:hidden p-2 hover:bg-slate-100 rounded-lg transition">
                <Menu className="w-5 h-5 text-slate-600" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Secondary nav: categories from backend */}
          <nav className="hidden md:flex items-center gap-1 py-2.5 border-t border-slate-100 overflow-x-auto scrollbar-hide" aria-label={t('marketplace.categories')}>
            <button
              onClick={handleReset}
              aria-pressed={!selectedCategory}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition ${!selectedCategory ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:bg-emerald-50'}`}
            >
              {t('common.all')}
            </button>
            <span className="mx-1.5 w-px h-5 bg-slate-200 shrink-0" aria-hidden="true" />
            {categories.slice(0, 10).map(cat => (
              <button
                key={cat.name}
                onClick={() => handleCategoryClick(cat.name)}
                aria-pressed={selectedCategory === cat.name}
                className={`shrink-0 px-3 py-1.5 text-sm font-medium transition flex items-center gap-1.5 ${selectedCategory === cat.name ? 'text-emerald-700 font-bold' : 'text-slate-600 hover:text-emerald-700'}`}
              >
                {cat.name}
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${selectedCategory === cat.name ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                  {cat.count || 0}
                </span>
              </button>
            ))}
            <span className="flex-1" aria-hidden="true" />
            <button
              onClick={() => setShowMap(true)}
              className="shrink-0 flex items-center gap-1.5 pl-3 py-1.5 text-sm font-medium text-slate-600 hover:text-emerald-600 transition"
            >
              <MapPin className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              {t('marketplace.shops_map')}
            </button>
          </nav>

          {/* Mobile search + categories */}
          {showMobileMenu && (
            <div className="md:hidden pb-3 space-y-3">
              <form onSubmit={handleSearch} role="search">
                <div className="flex w-full items-center border-2 border-emerald-500 rounded-full bg-white overflow-hidden">
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder={t('marketplace.search')}
                  aria-label={t('marketplace.search')}
                  className="flex-1 px-4 py-2.5 text-sm bg-transparent outline-none min-w-0 text-slate-900 placeholder:text-slate-400"
                  autoFocus
                />
                  <button type="submit" className="shrink-0 m-1 px-3.5 py-1.5 bg-emerald-600 text-white rounded-full text-sm font-medium hover:bg-emerald-700 transition">
                    <Search className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </form>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  onClick={handleReset}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${!selectedCategory ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  {t('common.all')}
                </button>
                {categories.slice(0, 8).map(cat => (
                  <button
                    key={cat.name}
                    onClick={() => handleCategoryClick(cat.name)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1 ${selectedCategory === cat.name ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    {cat.name}
                    <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full ${selectedCategory === cat.name ? 'bg-white/20 text-white' : 'bg-white text-slate-400'}`}>
                      {cat.count || 0}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <LanguageSwitcher dropdown />
                <button onClick={() => setShowSupport(true)} className="text-xs text-slate-500 hover:text-slate-700 transition">{t('marketplace.help')}</button>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <a href="/login?redirect=/marketplace" className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 border-2 border-emerald-500 text-emerald-700 rounded-full text-sm font-medium hover:bg-emerald-50 transition">
                  <LogIn className="w-4 h-4" aria-hidden="true" />
                  {t('marketplace.login')}
                </a>
                <a href="/login?register=1&redirect=/marketplace" className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-full text-sm font-semibold hover:bg-emerald-700 transition shadow-sm">
                  <UserPlus className="w-4 h-4" aria-hidden="true" />
                  {t('marketplace.register')}
                </a>
              </div>
            </div>
          )}
        </div>
      </header>

      <main id="main-content">
      {/* ===== HERO ===== */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                {selectedCategory ? selectedCategory : t('marketplace.all_products')}
              </h1>
              <h2 className="sr-only">{t('marketplace.products')}</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {t('marketplace.stats_format', { products: totalProducts, shops: shops.length })}
              </p>
            </div>
            {selectedCategory && (
              <button onClick={handleReset} className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition flex items-center gap-1">
                <X className="w-3 h-3" aria-hidden="true" /> {t('marketplace.clear_filter')}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ===== MAIN CONTENT: PRODUCTS + SHOPS ===== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            <button onClick={() => setError('')} aria-label="Xatoni yopish" className="ml-auto"><X className="w-3.5 h-3.5" aria-hidden="true" /></button>
          </div>
        )}

        {/* ===== TAVSIYA ETILGAN DO'KONLAR (backenddan isFeatured) ===== */}
        {featuredShops.length > 0 && (
          <section className="mb-8" aria-label={t('marketplace.featured_shops')}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" aria-hidden="true" />
                {t('marketplace.featured_shops')}
              </h2>
              <span className="text-xs text-slate-500">{featuredShops.length} ta do'kon</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {featuredShops.map(shop => (
                <div
                  key={shop._id}
                  onClick={() => navigate(`/marketplace/shop/${shop._id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/marketplace/shop/${shop._id}`)}
                  className={`bg-gradient-to-br ${shop.bannerColor || 'from-emerald-600 to-emerald-800'} text-white rounded-2xl p-5 cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 group relative overflow-hidden`}
                >
                  <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full group-hover:scale-125 transition-transform" aria-hidden="true" />
                  <div className="flex items-start justify-between gap-3 relative">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-extrabold text-lg border border-white/25">
                      {shop.name?.[0] || '?'}
                    </div>
                    <div className="flex items-center gap-0.5 bg-white/15 rounded-full px-2 py-0.5 text-xs font-bold">
                      <Star className="w-3 h-3 fill-current text-amber-300" aria-hidden="true" />
                      {shop.rating?.toFixed(1)}
                    </div>
                  </div>
                  <h3 className="font-extrabold mt-3 truncate group-hover:underline decoration-2 underline-offset-2">{shop.name}</h3>
                  <p className="text-[11px] text-white/70 flex items-center gap-1 mt-0.5 truncate">
                    <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                    {shop.city ? (shop.address ? `${shop.city}, ${shop.address}` : shop.city) : (shop.address || '')}
                  </p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-[11px] text-white/80">📦 {shop.productCount || 0} ta mahsulot</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-white/20 px-3 py-1.5 rounded-full group-hover:bg-white group-hover:text-emerald-700 transition">
                      {t('marketplace.view_shop')} <ArrowRight className="w-3 h-3" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ===== PRODUCTS GRID ===== */}
        <section>
          {/* Saralash */}
          <div className="flex items-center justify-end gap-2 mb-4">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" aria-hidden="true" /> {t('marketplace.sort')}
            </span>
            <select
              value={sort}
              onChange={handleSortChange}
              aria-label={t('marketplace.sort')}
              className="text-xs font-semibold border border-slate-200 rounded-xl bg-white px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-emerald-200 cursor-pointer hover:border-emerald-300 transition"
            >
              <option value="newest">{t('marketplace.sort_newest')}</option>
              <option value="price_asc">{t('marketplace.sort_price_asc')}</option>
              <option value="price_desc">{t('marketplace.sort_price_desc')}</option>
            </select>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-20">
              <Package className="w-16 h-16 mx-auto text-slate-400 mb-4" aria-hidden="true" />
              <p className="text-slate-500 text-sm">{t('marketplace.no_results')}</p>
              <button onClick={handleReset} className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition">
                {t('marketplace.view_all')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {products.map((product) => {
                const imgs = productImages(product)
                return (
                  <div
                    key={product._id}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:shadow-slate-200/70 hover:-translate-y-0.5 hover:border-emerald-200 transition-all duration-200 group flex flex-col cursor-pointer"
                    onClick={() => openProductModal(product)}
                  >
                    {/* Image / Icon */}
                    <div className="aspect-[4/3] bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center relative overflow-hidden">
                      {imgs.length > 0 ? (
                        <img
                          src={resolveImageUrl(imgs[0])}
                          alt={product.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => { e.currentTarget.style.display = 'none'; const fb = e.currentTarget.parentElement?.querySelector('.img-fallback'); if (fb) fb.classList.remove('hidden') }}
                        />
                      ) : null}
                      <div className={`img-fallback w-full h-full flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-slate-100 to-slate-200 ${imgs.length > 0 ? 'hidden' : ''}`}>
                        <Package className="w-10 h-10 text-slate-400" aria-hidden="true" />
                        <span className="text-[10px] text-slate-500">Rasm yo'q</span>
                      </div>
                      {/* Category badge */}
                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-white/90 backdrop-blur-sm text-slate-600 text-[10px] rounded-md border border-slate-100 shadow-sm">
                        {CATEGORY_EMOJIS[product.category] || '📦'} {product.category}
                      </span>
                      {/* Stock badge - neytral rangda */}
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-slate-900/70 backdrop-blur-sm text-white text-[9px] font-medium rounded-md">
                        {product.stock > 5 ? t('marketplace.in_stock') : product.stock > 0 ? t('products.low_stock') : t('products.out_of_stock')}
                      </span>
                      {imgs.length > 1 && (
                        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/50 text-white text-[9px] rounded-md">
                          +{imgs.length - 1}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3.5 flex flex-col flex-1">
                      {/* Shop name + address */}
                      <p className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1">
                        <Store className="w-3 h-3 shrink-0 text-slate-400" aria-hidden="true" /> {product.shopName}
                      </p>
                      {product.shopAddress && (
                        <p className="text-[9px] text-slate-400 truncate flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5 shrink-0" /> {product.shopCity ? `${product.shopCity}, ${product.shopAddress}` : product.shopAddress}
                        </p>
                      )}
                      {/* Product name */}
                      <h3 className="text-sm font-semibold text-slate-900 mt-1 line-clamp-2 leading-snug min-h-[2.5em] group-hover:text-emerald-700 transition-colors">
                        {product.name}
                      </h3>
                      {/* Price - katta va qalin */}
                      <div className="mt-auto pt-2.5">
                        <p className="text-lg font-extrabold text-slate-900 tracking-tight">{formatPrice(product.price)}</p>
                      </div>
                      {/* Buy & Cart Buttons */}
                      {product.stock > 0 ? (
                        <div className="flex items-center gap-1.5 mt-2.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              addToCart(product, { _id: product.shopId, name: product.shopName })
                            }}
                            className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border border-emerald-200 shadow-xs"
                            title="Savatga qo'shish"
                          >
                            <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                            Savatga
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              addToCart(product, { _id: product.shopId, name: product.shopName })
                              setShowCartModal(true)
                            }}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm shadow-emerald-200"
                            title="To'g'ridan-to'g'ri sotib olish"
                          >
                            Sotib Olish
                          </button>
                        </div>
                      ) : (
                        <button disabled className="mt-2.5 w-full py-2 bg-slate-100 text-slate-400 rounded-xl text-xs font-medium cursor-not-allowed">
                          {t('products.out_of_stock')}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Ko'proq yuklash */}
          {hasMore && (
            <div className="flex justify-center mt-8">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border-2 border-emerald-500 text-emerald-700 rounded-full text-sm font-semibold hover:bg-emerald-50 active:scale-[0.98] transition disabled:opacity-50"
              >
                {loadingMore ? (
                  <><div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /> {t('common.loading')}</>
                ) : (
                  <>{t('marketplace.load_more')} <ChevronDown className="w-4 h-4" aria-hidden="true" /></>
                )}
              </button>
            </div>
          )}
        </section>

        {/* ===== SHOPS SECTION ===== */}
        {shops.length > 0 && (
          <section id="shops" className="mt-10 scroll-mt-24">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Store className="w-5 h-5 text-emerald-600" />
                {t('marketplace.shops')}
              </h2>
              <span className="text-xs text-slate-500">{t('marketplace.shops_count', { count: shops.length })}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {shops.slice(0, 8).map((shop) => (
                <div
                  key={shop._id}
                  className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-emerald-200 transition-all duration-200 cursor-pointer group"
                  onClick={() => navigate(`/marketplace/shop/${shop._id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/marketplace/shop/${shop._id}`)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-bold text-sm shrink-0 group-hover:scale-110 transition-transform">
                      {shop.name?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 text-sm truncate group-hover:text-emerald-700 transition-colors">{shop.name}</h3>
                      {/* Address line - city + full address */}
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                        {shop.city ? (shop.address ? `${shop.city}, ${shop.address}` : shop.city) : (shop.address || '')}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 text-amber-600 shrink-0">
                      <Star className="w-3 h-3 fill-current" aria-hidden="true" />
                      <span className="text-[11px] font-bold text-slate-700">{shop.rating?.toFixed(1)}</span>
                    </div>
                  </div>

                  {shop.description && (
                    <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">{shop.description}</p>
                  )}

                  {shop.phone && (
                    <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                      <Phone className="w-3 h-3 shrink-0" aria-hidden="true" /> {shop.phone}
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {shop.categories?.slice(0, 2).map(c => (
                      <span key={c} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[9px] rounded-full">{c}</span>
                    ))}
                    {shop.categories?.length > 2 && (
                      <span className="text-[9px] text-slate-500">+{shop.categories.length - 2}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/marketplace/shop/${shop._id}`) }}
                      className="flex-1 py-1.5 bg-emerald-600 text-white rounded-lg text-[11px] font-medium hover:bg-emerald-700 transition flex items-center justify-center gap-1"
                    >
                      <Store className="w-3 h-3" /> {t('marketplace.order')}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleShopTelegram(shop) }}
                      aria-label={`${shop.name} - Telegram`}
                      className="py-1.5 px-2.5 border border-slate-200 text-slate-500 rounded-lg text-[11px] hover:bg-slate-50 transition"
                      title="Telegram"
                    >
                      <span aria-hidden="true">📱</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ===== STATS BAR ===== */}
        <section className="mt-10 bg-white rounded-2xl border border-slate-200 p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { value: stats?.totalShops || 0, label: t('marketplace.shops'), icon: Store },
              { value: stats?.totalProducts || 0, label: t('marketplace.products'), icon: Package },
              { value: stats?.totalCategories || 0, label: t('marketplace.categories'), icon: Grid },
              { value: shops.filter(s => s.isFeatured).length || 0, label: t('marketplace.featured'), icon: Star },
            ].map((stat, i) => {
              const Icon = stat.icon
              return (
                <div key={i}>
                  <Icon className="w-5 h-5 mx-auto text-emerald-500 mb-1.5" />
                  <p className="text-xl font-bold text-slate-800">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* ===== HOW IT WORKS ===== */}
      <section className="bg-white mt-6 py-10 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-slate-800">{t('marketplace.how_it_works')}</h2>
            <p className="text-sm text-slate-500 mt-1">{t('marketplace.how_desc')}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { step: '1', icon: Search, title: t('marketplace.step1_title'), desc: t('marketplace.step1_desc') },
              { step: '2', icon: ShoppingBag, title: t('marketplace.step2_title'), desc: t('marketplace.step2_desc') },
              { step: '3', icon: Truck, title: t('marketplace.step3_title'), desc: t('marketplace.step3_desc') },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <div key={i} className="text-center p-5 rounded-xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                    <Icon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center mx-auto mb-2">
                    {item.step}
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===== SELLER CTA ===== */}
      <section className="bg-gradient-to-r from-emerald-600 to-emerald-800 py-10">
        <div className="max-w-3xl mx-auto text-center px-4">
          <h2 className="text-xl font-bold text-white mb-2">{t('marketplace.cta_title')}</h2>
          <p className="text-emerald-100/80 text-sm mb-6 max-w-md mx-auto">
            {t('marketplace.cta_desc')}
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <a href="/login" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-700 rounded-xl font-bold text-sm hover:bg-emerald-50 transition shadow-lg">
              {t('marketplace.open_shop')} <ArrowRight className="w-4 h-4" />
            </a>
            <a href="/login" className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500/20 text-white rounded-xl font-medium text-sm hover:bg-emerald-500/30 transition border border-emerald-400/30">
              {t('marketplace.login')}
            </a>
          </div>
        </div>
      </section>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="bg-slate-900 text-slate-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
            <div>
              <img src="/images/marketplace-logo-dark.png" alt="OsonBozor" width="2400" height="800" className="h-7 w-auto mb-2" />
              <p className="text-xs text-slate-400 leading-relaxed">O'zbekistondagi mahalliy do'konlar platformasi. Toping, solishtiring, buyurtma bering.</p>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-2">{t('marketplace.for_sellers')}</h3>
              <ul className="space-y-1.5 text-xs">
                <li><a href="/login" className="hover:text-emerald-400 transition">{t('marketplace.free_register')}</a></li>
                <li><a href="/login" className="hover:text-emerald-400 transition">{t('marketplace.go_dashboard')}</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-2">{t('marketplace.contact')}</h3>
              <ul className="space-y-1.5 text-xs">
                <li>Telegram: @OSSON_BIZNES_BOT</li>
                <li>Email: admin@osonbiznes.uz</li>
                <li><button onClick={() => setShowSupport(true)} className="hover:text-emerald-400 transition">{t('marketplace.contact_admin')}</button></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-slate-400">{t('marketplace.copyright', { year: 2026 })}</p>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowSupport(true)} className="text-xs text-slate-300 hover:text-white transition">{t('marketplace.help')}</button>
              <span className="text-slate-500" aria-hidden="true">|</span>
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-xs text-slate-300 hover:text-white transition">OsonBiznes</button>
            </div>
          </div>
        </div>
      </footer>

      {/* ===== PRODUCT DETAIL MODAL ===== */}
      {productModal && (() => {
        const imgs = productImages(productModal)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={closeProductModal} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in z-10">
              {/* Close button */}
              <button onClick={closeProductModal} aria-label="Yopish" className="absolute top-4 right-4 z-10 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition">
                <X className="w-4 h-4 text-slate-600" aria-hidden="true" />
              </button>                {/* Image gallery */}
              {imgs.length > 0 && (
                <div className="relative bg-slate-100 aspect-[16/10]">
                  <img key={galleryIdx} src={resolveImageUrl(imgs[galleryIdx])} alt={productModal.name} className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; const fb = e.currentTarget.parentElement?.querySelector('.img-fallback'); if (fb) fb.classList.remove('hidden') }} />
                  <div className="img-fallback hidden w-full h-full flex-col items-center justify-center gap-1.5 bg-slate-100">
                    <Package className="w-12 h-12 text-slate-400" aria-hidden="true" />
                    <span className="text-xs text-slate-500">Rasm mavjud emas</span>
                  </div>
                  {imgs.length > 1 && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setGalleryIdx(prev => prev <= 0 ? imgs.length - 1 : prev - 1) }}
                        aria-label="Oldingi rasm"
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition"
                      >
                        <ChevronLeft className="w-5 h-5 text-slate-700" aria-hidden="true" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setGalleryIdx(prev => prev >= imgs.length - 1 ? 0 : prev + 1) }}
                        aria-label="Keyingi rasm"
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition"
                      >
                        <ChevronRight className="w-5 h-5 text-slate-700" aria-hidden="true" />
                      </button>
                      {/* Dots */}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                        {imgs.map((_, i) => (
                          <button key={i} onClick={() => setGalleryIdx(i)} aria-label={`${i + 1}-rasmni korish`} className={`w-2 h-2 rounded-full transition ${i === galleryIdx ? 'bg-white shadow-md' : 'bg-white/50'}`} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Product info */}
              <div className="p-6 sm:p-7 space-y-5">
                {/* Shop info - gradient ring + info cards */}
                <div className="flex items-start gap-4 pb-5 border-b border-slate-100">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-600 to-emerald-800 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-lg shadow-emerald-200 ring-4 ring-emerald-50">
                    {productModal.shopName?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 text-base">{productModal.shopName}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                      {(productModal.shopCity || productModal.shopAddress) && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="w-3 h-3 shrink-0 text-slate-400" aria-hidden="true" />
                          {productModal.shopCity ? (productModal.shopAddress ? `${productModal.shopCity}, ${productModal.shopAddress}` : productModal.shopCity) : productModal.shopAddress}
                        </span>
                      )}
                      {productModal.shopPhone && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <Phone className="w-3 h-3 shrink-0 text-slate-400" aria-hidden="true" />
                          {productModal.shopPhone}
                        </span>
                      )}
                    </div>
                  </div>
                  <a href={`https://t.me/${(productModal.shopBotUsername || 'OSSON_BIZNES_BOT').replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 rounded-full text-xs font-semibold hover:bg-sky-100 transition">
                    <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" /> Telegram
                  </a>
                </div>

                {/* Product details - narx katta */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded-md">
                        {CATEGORY_EMOJIS[productModal.category] || '📦'} {productModal.category}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded-md ${
                        productModal.stock > 5
                          ? 'bg-emerald-50 text-emerald-700'
                          : productModal.stock > 0
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {productModal.stock > 5 ? t('marketplace.in_stock') : productModal.stock > 0 ? t('products.low_stock') : t('products.out_of_stock')}
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">{productModal.name}</h3>
                    {productModal.sku && <p className="text-xs text-slate-400 font-mono mt-1.5">SKU: {productModal.sku}</p>}
                  </div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 shrink-0 tracking-tight">{formatPrice(productModal.price)}</p>
                </div>

                {productModal.description && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-1">{t('marketplace.shop_description')}</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">{productModal.description}</p>
                  </div>
                )}

                {/* More images thumbnails */}
                {imgs.length > 1 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-2">{t('marketplace.all_photos', { count: imgs.length })}</h4>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {imgs.map((url, i) => (
                        <button
                          key={i}
                          onClick={() => setGalleryIdx(i)}
                          aria-label={`${i + 1}-rasmni korish`}
                          className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition ${i === galleryIdx ? 'border-emerald-500' : 'border-transparent hover:border-slate-300'}`}
                        >
                          <img src={resolveImageUrl(url)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Buy button */}
                {productModal.stock > 0 ? (
                  <button
                    onClick={() => {
                      closeProductModal()
                      setTimeout(() => openOrderModal(
                        { _id: productModal.shopId, name: productModal.shopName, botUsername: '' },
                        productModal
                      ), 200)
                    }}
                    className="w-full py-3.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 active:scale-[0.99] transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-200/70"
                  >
                    <ShoppingBag className="w-5 h-5" aria-hidden="true" />
                    {t('marketplace.buy')} — {formatPrice(productModal.price)}
                  </button>
                ) : (
                  <button disabled className="w-full py-3.5 bg-slate-100 text-slate-500 rounded-xl text-sm font-bold cursor-not-allowed">
                    {t('products.out_of_stock')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ===== MAP MODAL (Do'konlar xaritasi) ===== */}
      {showMap && (() => {
        const mappedShops = shops.filter(s => s.latitude && s.longitude)
        const center = mappedShops[0] || shops[0]
        const lat = Number(center?.latitude) || 41.3111
        const lng = Number(center?.longitude) || 69.2406
        const bbox = `${lng - 0.06}%2C${lat - 0.045}%2C${lng + 0.06}%2C${lat + 0.045}`
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMap(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden animate-scale-in z-10 flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{t('marketplace.shops_map')}</h3>
                    <p className="text-xs text-slate-500">{shops.length} ta do'kon</p>
                  </div>
                </div>
                <button onClick={() => setShowMap(false)} aria-label="Yopish" className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200 transition">
                  <X className="w-4 h-4 text-slate-600" aria-hidden="true" />
                </button>
              </div>

              <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                {/* Map - katta */}
                <div className="md:w-3/5 h-[55vh] md:h-[78vh] min-h-[420px] bg-slate-100 relative">
                  <iframe
                    id="shop-map-src"
                    title="Do'konlar xaritasi"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`}
                    className="w-full h-full"
                    loading="lazy"
                  />
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=14/${lat}/${lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-2 right-2 text-xs bg-white shadow rounded-lg px-2.5 py-1.5 text-slate-600 hover:text-emerald-600 transition"
                  >
                    <ExternalLink className="w-3 h-3 inline mr-1" aria-hidden="true" />
                    Katta xarita
                  </a>
                </div>

                {/* Shop list */}
                <div className="md:w-2/5 overflow-y-auto p-4 space-y-2.5">
                  {shops.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-10">Do'konlar hozircha yo'q</p>
                  ) : (
                    shops.map(shop => (
                      <button
                        key={shop._id}
                        onClick={() => {
                          if (shop.latitude && shop.longitude) {
                            const el = document.querySelector('#shop-map-src')
                            if (el) el.src = `https://www.openstreetmap.org/export/embed.html?bbox=${Number(shop.longitude) - 0.06}%2C${Number(shop.latitude) - 0.045}%2C${Number(shop.longitude) + 0.06}%2C${Number(shop.latitude) + 0.045}&layer=mapnik&marker=${shop.latitude}%2C${shop.longitude}`
                          }
                        }}
                        className="w-full text-left flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 transition group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-bold text-xs shrink-0">
                          {shop.name?.[0] || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">{shop.name}</p>
                          <p className="text-xs text-slate-500 truncate flex items-center gap-0.5">
                            <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                            {shop.city ? (shop.address ? `${shop.city}, ${shop.address}` : shop.city) : (shop.address || 'Manzil kiritilmagan')}
                          </p>
                        </div>
                        {shop.latitude && shop.longitude ? (
                          <span className="shrink-0 text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">Xaritada</span>
                        ) : null}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ===== ORDER MODAL ===== */}
      {orderModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={closeOrderModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-800">{t('marketplace.order_title')}</h3>
              </div>
              <button onClick={closeOrderModal} aria-label="Yopish" className="p-1 hover:bg-slate-100 rounded-lg transition">
                <X className="w-5 h-5 text-slate-500" aria-hidden="true" />
              </button>
            </div>

            {orderSuccess ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">{orderSuccess.message}</h3>
                {orderSuccess.orderId && (
                  <p className="text-sm text-slate-500">Buyurtma: <span className="font-medium text-emerald-600">{orderSuccess.orderId}</span></p>
                )}
                <p className="text-xs text-slate-500 mt-2">{t('marketplace.shop_will_contact')}</p>
                <button onClick={closeOrderModal} className="mt-5 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition">
                  {t('marketplace.got_it')}
                </button>
              </div>
            ) : (
              <form onSubmit={handlePlaceOrder} className="space-y-3.5">
                {orderError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {orderError}
                  </div>
                )}

                {/* Order info */}
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-800">{orderModal.shop?.name}</span>
                  </div>
                  {orderModal.product && (
                    <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-200/50">
                      <p className="text-xs text-slate-600">📦 {orderModal.product.name}</p>
                      <p className="text-xs font-bold text-emerald-600">{formatPrice(orderModal.product.price)}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">{t('marketplace.your_name')} <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
                    <input type="text" value={orderForm.customer} onChange={e => setOrderForm({...orderForm, customer: e.target.value})} className="input-field pl-10" placeholder="Alisher" autoComplete="name" required />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">{t('marketplace.phone')} <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
                    <input type="tel" value={orderForm.phone} onChange={e => setOrderForm({...orderForm, phone: e.target.value})} className="input-field pl-10" placeholder="+998 90 123 45 67" autoComplete="tel" required />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">{t('marketplace.delivery_method')}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setOrderForm({...orderForm, deliveryMethod: 'pickup'})} className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition ${orderForm.deliveryMethod === 'pickup' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                      <Store className="w-4 h-4" /> {t('marketplace.pickup')}
                    </button>
                    <button type="button" onClick={() => setOrderForm({...orderForm, deliveryMethod: 'delivery'})} className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition ${orderForm.deliveryMethod === 'delivery' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                      <Truck className="w-4 h-4" /> {t('marketplace.delivery')}
                    </button>
                  </div>
                </div>

                {orderForm.deliveryMethod === 'delivery' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">{t('marketplace.address')}</label>
                    <div className="relative">
                      <Home className="absolute left-3 top-3 w-4 h-4 text-slate-500" aria-hidden="true" />
                      <textarea value={orderForm.address} onChange={e => setOrderForm({...orderForm, address: e.target.value})} className="input-field pl-10 resize-none" rows={2} placeholder="Toshkent sh., Chilonzor t., 12-uy" />
                    </div>
                  </div>
                )}

                <button type="submit" disabled={orderLoading} className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition flex items-center justify-center gap-2 disabled:opacity-50">
                  {orderLoading ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Yuborilmoqda...</>
                  ) : (
                    <><Send className="w-4 h-4" /> {t('marketplace.place_order')}</>
                  )}
                </button>

                <p className="text-[10px] text-slate-500 text-center">Buyurtmani yuborish orqali siz shaxsiy ma'lumotlarni qayta ishlashga rozilik bildirasiz</p>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <button
          onClick={() => {
            sounds.playClick()
            setShowCartModal(true)
          }}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-3 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-2xl shadow-emerald-600/40 hover:scale-105 active:scale-95 transition-all duration-200"
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5" />
            <span className="absolute -top-2 -right-2 min-w-[20px] h-[20px] px-1 bg-rose-500 text-white text-[11px] font-extrabold rounded-full flex items-center justify-center shadow-md animate-pulse">
              {cart.reduce((s, i) => s + i.qty, 0)}
            </span>
          </div>
          <div className="text-left">
            <span className="text-xs font-bold block leading-none">Savat ({cart.length} xil)</span>
            <span className="text-[11px] font-extrabold text-emerald-100 mt-0.5 block">
              {formatPrice(cart.reduce((s, i) => s + (i.price * i.qty), 0))}
            </span>
          </div>
        </button>
      )}

      {/* Universal Multi-Item Cart Modal */}
      <MarketplaceCartModal
        isOpen={showCartModal}
        onClose={() => setShowCartModal(false)}
        cart={cart}
        onUpdateQty={updateCartQty}
        onRemoveItem={removeFromCart}
        onClearCart={clearCart}
      />

      <SupportModal isOpen={showSupport} onClose={() => setShowSupport(false)} />
    </div>
  )
}
