import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Store, Star, MapPin, Phone, Package,
  ShoppingBag, CheckCircle2, AlertCircle, Send,
  X, Truck, Home, User, MessageSquare, ExternalLink,
  ChevronLeft, ChevronRight, Search, LogIn, UserPlus,
  Shield, Clock, RefreshCw,
} from 'lucide-react'
import api, { resolveImageUrl } from '../services/api'
import LanguageSwitcher from '../components/LanguageSwitcher'
import SupportModal from '../components/SupportModal'
import MarketplaceCartModal from '../components/MarketplaceCartModal'
import ProductCard from '../components/ProductCard'
import { useCart } from '../hooks/useCart'
import { useFavorites } from '../hooks/useFavorites'
import sounds from '../utils/audio'
import { toast } from '../components/Toast'

const CATEGORY_EMOJIS = {
  'Smartfonlar': '📱', 'Noutbuklar': '💻', 'Kompyuterlar': '🖥️',
  'Aksessuarlar': '🎧', 'Soatlar': '⌚', 'Kameralar': '📷',
  "O'yinlar": '🎮', 'Kiyimlar': '👕', 'Uy jihozlari': '🏠',
  'Planshetlar': '📟', 'Televizorlar': '📺', 'Boshqa': '📦',
}

function formatPrice(p) {
  return new Intl.NumberFormat('ru-RU').format(p || 0) + " so'm"
}

export default function OsonBozorShop() {
  const { shopId } = useParams()
  const navigate = useNavigate()

  const [shop, setShop] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showSupport, setShowSupport] = useState(false)

  // Umumiy savat (bozor, do'kon va mahsulot sahifalari bilan bir xil)
  const { cart, addToCart, updateCartQty, removeFromCart, clearCart } = useCart()
  const fav = useFavorites()
  const [showCartModal, setShowCartModal] = useState(false)

  // Product detail modal

  // Order modal
  const [orderModal, setOrderModal] = useState({ open: false, product: null })
  const [orderForm, setOrderForm] = useState({ customer: '', phone: '', address: '', deliveryMethod: 'pickup' })
  const [orderLoading, setOrderLoading] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(null)
  const [orderError, setOrderError] = useState('')

  const loadShop = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const data = await api.getMarketplaceShopDetail(shopId)
      setShop(data.shop)
      setProducts(data.products || [])
    } catch (err) {
      setError(err.message || 'Do\'kon ma\'lumotlari yuklanmadi')
    } finally {
      setLoading(false)
    }
  }, [shopId])

  useEffect(() => { loadShop() }, [loadShop])

  // Modal ochiq paytida fon scroll bo'lmasligi uchun
  useEffect(() => {
    const locked = orderModal.open
    document.body.style.overflow = locked ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [orderModal.open])

  // Marketplace doimo yorug' ko'rinishda bo'ladi (dark mode'da buzilmasligi uchun)
  useEffect(() => {
    const html = document.documentElement
    const hadDark = html.classList.contains('dark')
    html.classList.remove('dark')
    return () => {
      if (hadDark) html.classList.add('dark')
    }
  }, [])

  const filteredProducts = products.filter(p => {
    const matchesSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase())
    const matchesCat = !selectedCategory || p.category === selectedCategory
    return matchesSearch && matchesCat
  })

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))]

  const handlePlaceOrder = async (e) => {
    e.preventDefault()
    setOrderError('')
    if (!orderForm.customer.trim() || !orderForm.phone.trim()) {
      setOrderError('Ism va telefon raqam majburiy')
      return
    }
    setOrderLoading(true)
    try {
      const product = orderModal.product
      const items = product
        ? [{ name: product.name, qty: 1, price: product.price, productId: product._id }]
        : [{ name: `${shop?.name} dan buyurtma`, qty: 1, price: 0 }]
      const total = items.reduce((s, i) => s + i.price * i.qty, 0)

      const data = await api.request('/telegram/order', {
        method: 'POST',
        body: {
          customer: orderForm.customer.trim(),
          phone: orderForm.phone.trim(),
          items,
          total,
          source: 'website',
          ownerId: shopId,
          address: orderForm.address.trim(),
          deliveryMethod: orderForm.deliveryMethod,
        },
      })
      setOrderSuccess({ message: data.message || '✅ Buyurtma qabul qilindi!', orderId: data.data?.orderNumber })
    } catch (err) {
      setOrderError(err.message || 'Server xatoligi')
    } finally {
      setOrderLoading(false)
    }
  }

  const productImages = (p) => {
    if (p.images?.length > 0) return p.images
    if (p.image) return [p.image]
    return []
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Do'kon yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <Store className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">Do'kon topilmadi</h2>
          <p className="text-sm text-slate-500 mb-6">{error || 'Bunday do\'kon mavjud emas yoki OsonBozorda ko\'rinmaydi.'}</p>
          <button
            onClick={() => navigate('/marketplace')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition"
          >
            <ArrowLeft className="w-4 h-4" /> OsonBozorga qaytish
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 marketplace-page">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Back button */}
            <button
              onClick={() => navigate('/marketplace')}
              className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-700 transition group"
              aria-label="OsonBozorga qaytish"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-emerald-50 flex items-center justify-center transition">
                <ArrowLeft className="w-5 h-5" />
              </div>
              <span className="hidden sm:inline">OsonBozor</span>
            </button>

            {/* Shop title */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                {shop.name?.[0] || '?'}
              </div>
              <div className="min-w-0">
                <h1 className="font-extrabold text-slate-900 text-sm sm:text-base truncate flex items-center gap-1.5">
                  {shop.name}
                  {shop.isVerified && (
                    <Shield className="w-4 h-4 text-emerald-600 shrink-0" title="Tasdiqlangan do'kon" />
                  )}
                </h1>
                <p className="text-xs text-slate-500 truncate">
                  {products.length} ta mahsulot
                </p>
              </div>
            </div>

            {/* Actions */}
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
              <a
                href={`/login?redirect=/marketplace/shop/${shopId}`}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 border-2 border-emerald-500 text-emerald-700 rounded-full text-sm font-medium hover:bg-emerald-50 transition"
              >
                <LogIn className="w-4 h-4" /> Kirish
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Shop Hero Banner */}
      <div className={`bg-gradient-to-r ${shop.bannerColor || 'from-emerald-600 to-emerald-800'} text-white`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-4xl font-extrabold shadow-xl border border-white/30">
              {shop.name?.[0] || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-2xl font-extrabold">{shop.name}</h2>
                {shop.isVerified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white/20 rounded-full text-xs font-semibold">
                    <Shield className="w-3 h-3" /> Tasdiqlangan
                  </span>
                )}
                {shop.isFeatured && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-400/20 rounded-full text-xs font-semibold text-amber-200">
                    ⭐ Featured
                  </span>
                )}
              </div>
              {shop.description && (
                <p className="text-white/80 text-sm max-w-2xl line-clamp-2">{shop.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-white/80">
                {(shop.city || shop.address) && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 shrink-0" />
                    {shop.city ? (shop.address ? `${shop.city}, ${shop.address}` : shop.city) : shop.address}
                  </span>
                )}
                {shop.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4 shrink-0" /> {shop.phone}
                  </span>
                )}
                {shop.rating != null && (
                <span className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-current text-amber-300" />
                  <strong className="text-white">{shop.rating.toFixed(1)}</strong>
                </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Package className="w-4 h-4 shrink-0" /> {products.length} ta mahsulot
                </span>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => {
                  setOrderModal({ open: true, product: null })
                  setOrderForm({ customer: '', phone: '', address: '', deliveryMethod: 'pickup' })
                  setOrderSuccess(null)
                  setOrderError('')
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-700 rounded-xl font-bold text-sm hover:bg-emerald-50 transition shadow-lg"
              >
                <ShoppingBag className="w-4 h-4" /> Buyurtma berish
              </button>
              {shop.botUsername && (
                <a
                  href={`https://t.me/${shop.botUsername.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-medium text-sm transition"
                >
                  <MessageSquare className="w-4 h-4" /> Telegram
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Categories pills + Search */}
      <div className="bg-white border-b border-slate-100 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Mahsulot qidirish..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 transition"
              />
            </div>

            {/* Category filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide flex-1">
              <button
                onClick={() => setSelectedCategory('')}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition ${!selectedCategory ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Barchasi ({products.length})
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition ${selectedCategory === cat ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {CATEGORY_EMOJIS[cat] || '📦'} {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 text-sm">
              {search ? `"${search}" bo'yicha mahsulot topilmadi` : 'Bu do\'konda hozircha mahsulot yo\'q'}
            </p>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition"
              >
                Filtrni tozalash
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-4">
              {filteredProducts.length} ta mahsulot topildi
              {selectedCategory && ` — "${selectedCategory}" kategoriyasida`}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
              {filteredProducts.map(product => (
                <ProductCard key={product._id} product={product} onAdd={(p) => addToCart(p, shop)} showShop={false} fav={fav.has(product._id)} onFav={fav.toggle} />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs">© 2026 OsonBiznes.uz — Barcha huquqlar himoyalangan</p>
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/marketplace')} className="text-xs hover:text-emerald-400 transition flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> OsonBozor
              </button>
              <button onClick={() => setShowSupport(true)} className="text-xs hover:text-emerald-400 transition">Yordam</button>
            </div>
          </div>
        </div>
      </footer>

      {/* Product Detail Modal */}


      {/* Order Modal */}
      {orderModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOrderModal({ open: false, product: null })} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-800">Buyurtma berish</h3>
              </div>
              <button onClick={() => setOrderModal({ open: false, product: null })} className="p-1 hover:bg-slate-100 rounded-lg transition">
                <X className="w-5 h-5 text-slate-500" />
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
                <p className="text-xs text-slate-500 mt-2">Do'kon siz bilan tez orada bog'lanadi</p>
                <button onClick={() => setOrderModal({ open: false, product: null })} className="mt-5 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition">
                  Tushunarli
                </button>
              </div>
            ) : (
              <form onSubmit={handlePlaceOrder} className="space-y-3.5">
                {orderError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {orderError}
                  </div>
                )}

                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-800">{shop.name}</span>
                  </div>
                  {orderModal.product && (
                    <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-200/50">
                      <p className="text-xs text-slate-600">📦 {orderModal.product.name}</p>
                      <p className="text-xs font-bold text-emerald-600">{formatPrice(orderModal.product.price)}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Ismingiz <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={orderForm.customer} onChange={e => setOrderForm({ ...orderForm, customer: e.target.value })} className="input-field pl-10" placeholder="Alisher Rahimov" autoComplete="name" required />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Telefon <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="tel" value={orderForm.phone} onChange={e => setOrderForm({ ...orderForm, phone: e.target.value })} className="input-field pl-10" placeholder="+998 90 123 45 67" autoComplete="tel" required />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Yetkazib berish usuli</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setOrderForm({ ...orderForm, deliveryMethod: 'pickup' })} className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition ${orderForm.deliveryMethod === 'pickup' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                      <Store className="w-4 h-4" /> Olib ketish
                    </button>
                    <button type="button" onClick={() => setOrderForm({ ...orderForm, deliveryMethod: 'delivery' })} className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition ${orderForm.deliveryMethod === 'delivery' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                      <Truck className="w-4 h-4" /> Yetkazib berish
                    </button>
                  </div>
                </div>

                {orderForm.deliveryMethod === 'delivery' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Manzil</label>
                    <div className="relative">
                      <Home className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <textarea value={orderForm.address} onChange={e => setOrderForm({ ...orderForm, address: e.target.value })} className="input-field pl-10 resize-none" rows={2} placeholder="Toshkent sh., Chilonzor t., 12-uy" />
                    </div>
                  </div>
                )}

                <button type="submit" disabled={orderLoading} className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition flex items-center justify-center gap-2 disabled:opacity-50">
                  {orderLoading ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Yuborilmoqda...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Buyurtma yuborish</>
                  )}
                </button>

                <p className="text-[10px] text-slate-500 text-center">
                  Buyurtmani yuborish orqali siz shaxsiy ma'lumotlarni qayta ishlashga rozilik bildirasiz
                </p>
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
