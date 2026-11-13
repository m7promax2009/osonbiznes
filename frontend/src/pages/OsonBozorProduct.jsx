import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, MapPin, Phone, Send, Store, BadgeCheck,
  Minus, Plus, ShoppingBag, Truck, Wallet, Package, Navigation, Heart,
} from 'lucide-react'
import api, { resolveImageUrl } from '../services/api'
import { recordInterest } from '../services/interests'
import { useCart } from '../hooks/useCart'
import { useFavorites } from '../hooks/useFavorites'
import MarketHeader from '../components/MarketHeader'
import MarketplaceCartModal from '../components/MarketplaceCartModal'
import ProductCard, { formatPrice, productImages } from '../components/ProductCard'

function Gallery({ images, name }) {
  const [idx, setIdx] = useState(0)
  const n = images.length
  useEffect(() => setIdx(0), [images])
  const go = (d) => setIdx((i) => (i + d + n) % n)

  if (!n) {
    return (
      <div className="aspect-square rounded-3xl bg-[#F3F4F6] flex flex-col items-center justify-center text-slate-400">
        <Package className="w-14 h-14" aria-hidden="true" />
        <span className="text-sm mt-2">Rasm yo'q</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col-reverse lg:flex-row gap-3">
      {n > 1 && (
        <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible scrollbar-hide" role="tablist" aria-label="Rasmlar">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              role="tab"
              aria-selected={i === idx}
              aria-label={`${i + 1}-rasm`}
              onClick={() => setIdx(i)}
              onMouseEnter={() => setIdx(i)}
              className={`shrink-0 w-16 h-16 lg:w-20 lg:h-20 rounded-xl bg-[#F3F4F6] overflow-hidden border-2 transition-colors ${i === idx ? 'border-[#047857]' : 'border-transparent hover:border-slate-300'}`}
            >
              <img src={resolveImageUrl(src)} alt="" className="w-full h-full object-contain p-1.5 mix-blend-multiply" />
            </button>
          ))}
        </div>
      )}
      <div className="relative flex-1 aspect-square rounded-3xl bg-[#F3F4F6] overflow-hidden group">
        <img
          key={images[idx]}
          src={resolveImageUrl(images[idx])}
          alt={name}
          className="absolute inset-0 w-full h-full object-contain p-6 sm:p-10 mix-blend-multiply gallery-in"
        />
        {n > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Oldingi rasm" className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Keyingi rasm" className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
              <ChevronRight className="w-5 h-5" />
            </button>
            <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-white/90 text-xs font-medium text-slate-700">
              {idx + 1} / {n}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-6 grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-8 animate-pulse" aria-busy="true">
      <div className="aspect-square rounded-3xl bg-slate-200" />
      <div className="space-y-4">
        <div className="h-8 w-3/4 rounded bg-slate-200" />
        <div className="h-10 w-1/3 rounded bg-slate-200" />
        <div className="h-32 rounded-2xl bg-slate-200" />
      </div>
    </div>
  )
}

export default function OsonBozorProduct() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { cart, count, addToCart, updateCartQty, removeFromCart, clearCart } = useCart()
  const fav = useFavorites()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [qty, setQty] = useState(1)
  const [search, setSearch] = useState('')
  const [showCart, setShowCart] = useState(false)

  useEffect(() => {
    let alive = true
    setData(null)
    setError('')
    setQty(1)
    window.scrollTo({ top: 0 })
    api
      .request(`/marketplace/products/${id}`)
      .then((res) => {
        if (!alive) return
        setData(res.data)
        if (res.data?.product?.category) recordInterest(res.data.product.category, 1)
      })
      .catch((err) => alive && setError(err.message || 'Mahsulot topilmadi'))
    return () => {
      alive = false
    }
  }, [id])

  useEffect(() => {
    if (data?.product) document.title = `${data.product.name} — OsonBozor`
    return () => {
      document.title = 'OsonBiznes'
    }
  }, [data])

  const product = data?.product
  const shop = data?.shop
  const imgs = productImages(product)
  const inStock = product?.stock > 0
  const shopRef = shop ? { _id: shop._id, name: shop.name } : null
  const add = (p) => addToCart(p, p.shopId === shop?._id ? shopRef : null)

  const buyNow = () => {
    addToCart(product, shopRef, qty)
    setShowCart(true)
  }

  const header = (
    <MarketHeader
      search={search}
      onSearchChange={setSearch}
      onSearchSubmit={(q) => navigate(q ? `/marketplace?q=${encodeURIComponent(q)}` : '/marketplace')}
      cartCount={count}
      onCart={() => setShowCart(true)}
      favCount={fav.count}
      onFavorites={() => navigate('/marketplace?fav=1')}
    />
  )

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        {header}
        <div className="max-w-xl mx-auto px-4 py-24 text-center">
          <Package className="w-14 h-14 mx-auto text-slate-300" aria-hidden="true" />
          <h1 className="font-display text-2xl font-bold mt-4 text-[#111827]">Mahsulot topilmadi</h1>
          <p className="text-slate-600 mt-2">U sotib bo'lingan yoki do'kon uni olib tashlagan bo'lishi mumkin.</p>
          <Link to="/marketplace" className="inline-flex mt-6 h-11 px-6 items-center rounded-xl bg-[#047857] text-white font-semibold">
            OsonBozor'ga qaytish
          </Link>
        </div>
      </div>
    )
  }

  const mapUrl =
    shop?.latitude && shop?.longitude
      ? `https://yandex.uz/maps/?pt=${shop.longitude},${shop.latitude}&z=17&l=map`
      : shop?.address
        ? `https://yandex.uz/maps/?text=${encodeURIComponent([shop.city, shop.address].filter(Boolean).join(', '))}`
        : null

  return (
    <div className="min-h-screen bg-white text-[#111827] pb-24 lg:pb-0">
      {header}
      {!product ? (
        <Skeleton />
      ) : (
        <main className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8">
          <nav aria-label="Yo'l" className="py-4 text-sm text-slate-500 flex items-center gap-1.5 min-w-0">
            <Link to="/marketplace" className="hover:text-[#047857] shrink-0">OsonBozor</Link>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <Link to={`/marketplace?category=${encodeURIComponent(product.category)}`} className="hover:text-[#047857] shrink-0">
              {product.category}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate text-slate-700">{product.name}</span>
          </nav>

          <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-6 lg:gap-12 items-start">
            <Gallery images={imgs} name={product.name} />

            <div className="lg:sticky lg:top-24 space-y-5">
              <div>
                <div className="flex items-start gap-3">
                  <h1 className="flex-1 font-display text-2xl sm:text-3xl font-bold leading-tight tracking-tight">{product.name}</h1>
                  <button
                    type="button"
                    onClick={() => fav.toggle(product)}
                    aria-pressed={fav.has(product._id)}
                    aria-label={fav.has(product._id) ? 'Saralanganlardan olib tashlash' : "Saralanganlarga qo'shish"}
                    className="shrink-0 w-11 h-11 rounded-full border border-slate-200 flex items-center justify-center hover:border-[#F43F5E]"
                  >
                    <Heart className={`w-5 h-5 ${fav.has(product._id) ? 'fill-[#F43F5E] text-[#F43F5E]' : 'text-slate-600'}`} />
                  </button>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {product.category}
                  {product.sku ? <span className="ml-3">Kod: {product.sku}</span> : null}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="font-display text-3xl sm:text-[2.1rem] font-bold tracking-tight">{formatPrice(product.price)}</p>
                <p className={`mt-1.5 text-sm font-medium ${inStock ? (product.stock <= 3 ? 'text-[#C2410C]' : 'text-[#047857]') : 'text-red-700'}`}>
                  {inStock ? (product.stock <= 3 ? `Omborda faqat ${product.stock} ta qoldi` : 'Omborda bor') : 'Hozircha tugagan'}
                </p>

                {inStock && (
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <div className="flex items-center h-12 rounded-xl border border-slate-300" role="group" aria-label="Soni">
                      <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Kamaytirish" className="w-11 h-full flex items-center justify-center disabled:opacity-30">
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-semibold tabular-nums" aria-live="polite">{qty}</span>
                      <button type="button" onClick={() => setQty((q) => Math.min(product.stock, q + 1))} disabled={qty >= product.stock} aria-label="Ko'paytirish" className="w-11 h-full flex items-center justify-center disabled:opacity-30">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <button type="button" onClick={() => addToCart(product, shopRef, qty)} className="hidden lg:flex flex-1 h-12 items-center justify-center gap-2 rounded-xl bg-[#ECFDF5] text-[#047857] font-semibold hover:bg-[#D1FAE5] transition-colors">
                      <ShoppingBag className="w-5 h-5" aria-hidden="true" /> Savatga qo'shish
                    </button>
                    <button type="button" onClick={buyNow} className="hidden lg:flex flex-1 h-12 items-center justify-center rounded-xl bg-[#047857] text-white font-semibold hover:bg-[#065F46] transition-colors">
                      Buyurtma berish
                    </button>
                  </div>
                )}

                <ul className="mt-5 pt-5 border-t border-slate-100 space-y-2.5 text-sm text-slate-700">
                  <li className="flex gap-2.5">
                    <Truck className="w-[18px] h-[18px] text-[#047857] shrink-0 mt-0.5" aria-hidden="true" />
                    Yetkazib berish yoki do'kondan olib ketish — buyurtmada tanlaysiz
                  </li>
                  <li className="flex gap-2.5">
                    <Wallet className="w-[18px] h-[18px] text-[#047857] shrink-0 mt-0.5" aria-hidden="true" />
                    To'lov mahsulotni olganingizda: naqd yoki karta
                  </li>
                </ul>
              </div>

              {shop && (
                <section aria-label="Sotuvchi" className="rounded-2xl bg-[#F3F4F6] p-5">
                  <div className="flex items-start gap-3">
                    <span className="w-12 h-12 rounded-xl bg-[#D1FAE5] text-[#047857] font-display font-bold text-xl flex items-center justify-center shrink-0">
                      {shop.name?.[0] || '?'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link to={`/marketplace/shop/${shop._id}`} className="font-semibold text-lg hover:text-[#047857] flex items-center gap-1.5">
                        <span className="truncate">{shop.name}</span>
                        {shop.isVerified && <BadgeCheck className="w-[18px] h-[18px] text-[#047857] shrink-0" aria-label="Tasdiqlangan do'kon" />}
                      </Link>
                      <p className="text-sm text-slate-600">{shop.productCount} ta mahsulot</p>
                    </div>
                  </div>

                  {(shop.address || shop.city) && (
                    <div className="mt-4 flex gap-2.5 text-sm">
                      <MapPin className="w-[18px] h-[18px] text-[#047857] shrink-0 mt-0.5" aria-hidden="true" />
                      <div>
                        <p className="font-medium">{shop.city}</p>
                        <p className="text-slate-600">{shop.address}</p>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {mapUrl && (
                      <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="h-11 rounded-xl bg-white flex items-center justify-center gap-1.5 text-sm font-semibold hover:bg-slate-50">
                        <Navigation className="w-4 h-4" aria-hidden="true" /> Xaritada
                      </a>
                    )}
                    {shop.phone && (
                      <a href={`tel:${shop.phone.replace(/\s/g, '')}`} className="h-11 rounded-xl bg-white flex items-center justify-center gap-1.5 text-sm font-semibold hover:bg-slate-50">
                        <Phone className="w-4 h-4" aria-hidden="true" /> Qo'ng'iroq
                      </a>
                    )}
                    {shop.botUsername && (
                      <a href={`https://t.me/${shop.botUsername.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="h-11 rounded-xl bg-white flex items-center justify-center gap-1.5 text-sm font-semibold hover:bg-slate-50">
                        <Send className="w-4 h-4" aria-hidden="true" /> Telegram
                      </a>
                    )}
                    <Link to={`/marketplace/shop/${shop._id}`} className="h-11 rounded-xl bg-white flex items-center justify-center gap-1.5 text-sm font-semibold hover:bg-slate-50">
                      <Store className="w-4 h-4" aria-hidden="true" /> Do'konga o'tish
                    </Link>
                  </div>
                </section>
              )}

              {product.description && (
                <section aria-labelledby="desc-h">
                  <h2 id="desc-h" className="font-semibold text-lg">Tavsif</h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-slate-700 whitespace-pre-line">{product.description}</p>
                </section>
              )}
            </div>
          </div>

          {data.similar?.length > 0 && (
            <section className="mt-14" aria-labelledby="sim-h">
              <h2 id="sim-h" className="font-display text-xl sm:text-2xl font-bold">O'xshash mahsulotlar</h2>
              <p className="text-sm text-slate-500 mt-1">{product.category} — boshqa do'konlardan ham, narxlarni solishtiring</p>
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
                {data.similar.map((p) => (
                  <ProductCard key={p._id} product={p} onAdd={add} fav={fav.has(p._id)} onFav={fav.toggle} />
                ))}
              </div>
            </section>
          )}

          {data.fromShop?.length > 0 && (
            <section className="mt-14 mb-16" aria-labelledby="shop-h">
              <div className="flex items-end justify-between gap-4">
                <h2 id="shop-h" className="font-display text-xl sm:text-2xl font-bold">{shop?.name} do'konidan</h2>
                <Link to={`/marketplace/shop/${shop?._id}`} className="text-sm font-semibold text-[#047857] hover:underline shrink-0">
                  Hammasi
                </Link>
              </div>
              <div className="mt-5 flex gap-3 sm:gap-5 overflow-x-auto scrollbar-hide snap-x pb-2">
                {data.fromShop.map((p) => (
                  <div key={p._id} className="w-[44%] sm:w-[13rem] shrink-0 snap-start">
                    <ProductCard product={p} onAdd={add} showShop={false} fav={fav.has(p._id)} onFav={fav.toggle} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      )}

      {product && inStock && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 px-4 py-3 flex items-center gap-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <button type="button" onClick={() => addToCart(product, shopRef, qty)} aria-label="Savatga qo'shish" className="h-12 w-12 rounded-xl bg-[#ECFDF5] text-[#047857] flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </button>
          <button type="button" onClick={buyNow} className="flex-1 h-12 rounded-xl bg-[#047857] text-white font-semibold">
            Buyurtma berish · {formatPrice(product.price * qty)}
          </button>
        </div>
      )}

      <MarketplaceCartModal
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        cart={cart}
        onUpdateQty={updateCartQty}
        onRemoveItem={removeFromCart}
        onClearCart={clearCart}
      />
    </div>
  )
}
