import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { MapPin, Package, X, AlertCircle, ChevronDown, ExternalLink, BadgeCheck, LayoutGrid, SlidersHorizontal, Heart, Navigation } from 'lucide-react'
import MarketplaceBanner from '../components/MarketplaceBanner'
import MarketHeader from '../components/MarketHeader'
import ProductCard from '../components/ProductCard'
import { recordInterest, interestsParam, feedSeed } from '../services/interests'
import api, { resolveImageUrl } from '../services/api'
import SupportModal from '../components/SupportModal'
import MarketplaceCartModal from '../components/MarketplaceCartModal'
import { useCart } from '../hooks/useCart'
import { useFavorites } from '../hooks/useFavorites'
import { useNearMe } from '../hooks/useNearMe'

const PRODUCTS_PER_PAGE = 24

const TINTS = ['#D1FAE5', '#E0F2FE', '#FCE7F3', '#FEF3C7', '#EDE9FE', '#FFE4DE']

const SORTS = [
  { v: 'recommended', label: 'Siz uchun' },
  { v: 'nearest', label: 'Yaqinimda' },
  { v: 'newest', label: 'Yangilari' },
  { v: 'price_asc', label: 'Arzonroq' },
  { v: 'price_desc', label: 'Qimmatroq' },
]

const shopAddress = (s) => [s.city, s.address].filter(Boolean).join(', ')

export default function OsonBozor() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { cart, count, addToCart, updateCartQty, removeFromCart, clearCart } = useCart()
  const fav = useFavorites()
  const { near, status: nearStatus, locate, nearParam } = useNearMe()
  const [cities, setCities] = useState([])
  const [priceOpen, setPriceOpen] = useState(false)
  const [priceDraft, setPriceDraft] = useState({ min: '', max: '' })

  const [shops, setShops] = useState([])
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [featuredShops, setFeaturedShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchInput, setSearchInput] = useState(params.get('q') || '')
  const [sort, setSort] = useState('recommended')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [totalProducts, setTotalProducts] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showCart, setShowCart] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [showSupport, setShowSupport] = useState(false)

  // Filtrlar URL'da — orqaga tugmasi, ulashish va mahsulot sahifasidan qaytish ishlaydi
  const searchQuery = (params.get('q') || '').trim()
  const selectedCategory = params.get('category') || ''
  const city = params.get('city') || ''
  const minPrice = params.get('min') || ''
  const maxPrice = params.get('max') || ''
  const favView = params.get('fav') === '1'
  const setFilter = useCallback(
    (next) => {
      const p = new URLSearchParams(params)
      Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)))
      setParams(p, { replace: false })
    },
    [params, setParams]
  )

  // Yozish bilan qidiruv: 400 ms kutib URL'ni almashtiramiz (replace — har harf tarixga yozilmaydi)
  const pushedQ = useRef(params.get('q') || '')
  useEffect(() => {
    const q = searchInput.trim()
    if (q === (params.get('q') || '')) return undefined
    const t = setTimeout(() => {
      pushedQ.current = q
      const p = new URLSearchParams(window.location.search)
      if (q) p.set('q', q)
      else p.delete('q')
      setParams(p, { replace: true })
    }, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  // Orqaga/oldinga tugmalari: URL o'zgarsa va bu biz yozgan qiymat bo'lmasa — inputni moslaymiz
  useEffect(() => {
    const q = params.get('q') || ''
    if (q !== pushedQ.current) {
      pushedQ.current = q
      setSearchInput(q)
    }
  }, [params])

  const buildParams = (pageNo) => {
    const q = { limit: PRODUCTS_PER_PAGE, page: pageNo, sort }
    if (sort === 'recommended') {
      q.seed = feedSeed()
      const interests = interestsParam()
      if (interests) q.interests = interests
    }
    if (selectedCategory) q.category = selectedCategory
    if (searchQuery) q.search = searchQuery
    if (city) q.city = city
    if (minPrice) q.minPrice = minPrice
    if (maxPrice) q.maxPrice = maxPrice
    if (nearParam) q.near = nearParam
    return q
  }

  const reqRef = useRef(0)
  const fetchData = useCallback(async () => {
    const reqId = ++reqRef.current
    try {
      setLoading(true)
      setError('')
      const [shopsRes, prodRes, catRes, featRes] = await Promise.all([
        api.getMarketplaceShops(searchQuery ? { search: searchQuery } : {}),
        api.getMarketplaceProducts(buildParams(1)),
        api.getMarketplaceCategories(),
        api.getFeaturedShops().catch(() => []),
      ])
      if (reqId !== reqRef.current) return
      setShops(shopsRes.data || [])
      setProducts(prodRes.data || [])
      setTotalProducts(prodRes.total || 0)
      setHasMore((prodRes.page || 1) < (prodRes.totalPages || 1))
      setCategories(catRes || [])
      setFeaturedShops(Array.isArray(featRes) ? featRes : [])
      setPage(1)
    } catch (err) {
      if (reqId === reqRef.current) setError(err.message || "Ma'lumot yuklanmadi")
    } finally {
      if (reqId === reqRef.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, selectedCategory, searchQuery, city, minPrice, maxPrice, nearParam])

  useEffect(() => {
    api.request('/marketplace/cities').then((r) => setCities(r.data || [])).catch(() => {})
  }, [])

  // "Yaqinimda" — joylashuv so'raladi, keyin masofa bo'yicha saralanadi
  const chooseSort = async (v) => {
    if (v === 'nearest' && !near) {
      const got = await locate()
      if (!got) return
    }
    setSort(v)
  }

  const applyPrice = (e) => {
    e?.preventDefault()
    const clean = (v) => String(v).replace(/\D/g, '')
    setFilter({ min: clean(priceDraft.min), max: clean(priceDraft.max) })
    setPriceOpen(false)
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const loadMore = async () => {
    if (loadingMore) return
    const reqId = ++reqRef.current
    const next = page + 1
    try {
      setLoadingMore(true)
      const res = await api.getMarketplaceProducts(buildParams(next))
      if (reqId !== reqRef.current) return
      setProducts((prev) => [...prev, ...(res.data || [])])
      setPage(next)
      setHasMore(next < (res.totalPages || 1))
    } catch (err) {
      if (reqId === reqRef.current) setError(err.message)
    } finally {
      if (reqId === reqRef.current) setLoadingMore(false)
    }
  }

  const pickCategory = (name) => {
    if (name && name !== selectedCategory) recordInterest(name, 2)
    setFilter({ category: name === selectedCategory ? '' : name })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const reset = () => {
    pushedQ.current = ''
    setSearchInput('')
    setSort('recommended')
    setParams(new URLSearchParams())
  }

  // Marketplace doimo yorug' ko'rinishda
  useEffect(() => {
    const html = document.documentElement
    const hadDark = html.classList.contains('dark')
    html.classList.remove('dark')
    return () => {
      if (hadDark) html.classList.add('dark')
    }
  }, [])

  useEffect(() => {
    document.body.style.overflow = showMap ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [showMap])

  const isHome = !searchQuery && !selectedCategory && !city && !minPrice && !maxPrice && !favView
  const shown = favView ? fav.favorites : products
  const priceLabel = minPrice || maxPrice ? `${minPrice ? Number(minPrice).toLocaleString('ru-RU') : '0'} – ${maxPrice ? Number(maxPrice).toLocaleString('ru-RU') : '∞'}` : 'Narx'
  const add = (p) => addToCart(p, { _id: p.shopId, name: p.shopName })

  return (
    <div className="min-h-screen bg-white text-[#111827] marketplace-page">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#047857] focus:text-white focus:rounded-lg focus:text-sm">
        Asosiy kontentga o'tish
      </a>

      <MarketHeader
        search={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={(q) => { pushedQ.current = q; setFilter({ q }) }}
        cartCount={count}
        onCart={() => setShowCart(true)}
        onMap={() => setShowMap(true)}
        favCount={fav.count}
        onFavorites={() => setFilter({ fav: favView ? '' : '1' })}
        cities={cities}
        city={city}
        onCity={(c) => setFilter({ city: c })}
        near={!!near}
        nearStatus={nearStatus}
        onLocate={() => chooseSort('nearest')}
        categories={categories}
        onCategory={pickCategory}
      />

      <main id="main-content" className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-16">
        {error && (
          <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            <button onClick={fetchData} className="ml-auto font-semibold underline">Qayta urinish</button>
          </div>
        )}

        {isHome && (
          <MarketplaceBanner
            featuredShops={featuredShops}
            categories={categories}
            products={products}
            onOpenShop={(id) => navigate(`/marketplace/shop/${id}`)}
            onCategory={pickCategory}
            onSell={() => navigate('/login?register=1')}
          />
        )}

        {/* Kategoriyalar — rasmli plitkalar */}
        {categories.length > 0 && (
          <nav aria-label="Kategoriyalar" className="mt-6 -mx-4 px-4 scroll-px-4 sm:mx-0 sm:px-0 sm:scroll-px-0 flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide snap-x">
            <button type="button" onClick={() => setFilter({ category: '' })} aria-pressed={!selectedCategory} className="cat-tile snap-start">
              <span className={`cat-img ${!selectedCategory ? 'is-active' : ''}`}>
                <LayoutGrid className="w-7 h-7 text-[#047857]" aria-hidden="true" />
              </span>
              <span className="cat-label">Hammasi</span>
            </button>
            {categories.map((c, i) => (
              <button key={c.name} style={{ '--tint': TINTS[i % TINTS.length] }} type="button" onClick={() => pickCategory(c.name)} aria-pressed={selectedCategory === c.name} className="cat-tile snap-start">
                <span className={`cat-img ${selectedCategory === c.name ? 'is-active' : ''}`}>
                  {c.image ? <img src={resolveImageUrl(c.image)} alt="" loading="lazy" className="w-full h-full object-contain p-2 mix-blend-multiply" /> : <Package className="w-7 h-7 text-slate-400" aria-hidden="true" />}
                </span>
                <span className="cat-label">{c.name}</span>
              </button>
            ))}
          </nav>
        )}

        {/* Tavsiya etilgan do'konlar — har biri o'z mahsulot rasmlari bilan */}
        {isHome && featuredShops.length > 0 && (
          <section className="mt-10" aria-labelledby="feat-h">
            <h2 id="feat-h" className="font-display text-xl sm:text-2xl font-bold tracking-tight">Mashhur do'konlar</h2>
            <div className="mt-4 -mx-4 px-4 scroll-px-4 flex overflow-x-auto scrollbar-hide snap-x gap-3 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 xl:grid-cols-3 sm:gap-4 sm:overflow-visible">
              {featuredShops.map((s) => (
                <Link key={s._id} to={`/marketplace/shop/${s._id}`} className="shop-card group w-[85%] shrink-0 snap-start sm:w-auto rounded-2xl border border-slate-200 p-3 flex gap-3 hover:border-[#10B981] transition-colors">
                  <div className="grid grid-cols-3 gap-1.5 w-[55%] shrink-0">
                    {[0, 1, 2].map((k) => {
                      const p = s.previewProducts?.[k]
                      return (
                        <span key={k} className="aspect-square rounded-xl bg-[#F3F4F6] overflow-hidden">
                          {p?.image && <img src={resolveImageUrl(p.image)} alt="" loading="lazy" className="w-full h-full object-contain p-1.5 mix-blend-multiply transition-transform duration-500 group-hover:scale-105" />}
                        </span>
                      )
                    })}
                  </div>
                  <div className="min-w-0 flex flex-col justify-center">
                    <p className="font-semibold flex items-center gap-1 min-w-0">
                      <span className="truncate">{s.name}</span>
                      {s.isVerified && <BadgeCheck className="w-4 h-4 text-[#047857] shrink-0" aria-label="Tasdiqlangan" />}
                    </p>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{shopAddress(s)}</p>
                    <p className="text-xs font-medium text-[#047857] mt-1.5">{s.productCount} ta mahsulot</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Mahsulotlar */}
        <section className="mt-10" aria-labelledby="grid-h">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 id="grid-h" className="font-display text-xl sm:text-2xl font-bold tracking-tight">
                {favView ? 'Saralangan' : searchQuery ? `"${searchQuery}" bo'yicha` : selectedCategory || (city ? `${city} do'konlari` : sort === 'nearest' ? "Sizga eng yaqin do'konlardan" : 'Siz uchun tanlab oldik')}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                <b className="text-[#0F172A]">{favView ? fav.count : totalProducts}</b> ta mahsulot{!isHome && !favView && shops.length ? `, ${shops.length} ta do'kon` : ''}
              </p>
            </div>
            {!favView && (
              <div className="flex flex-wrap items-center gap-2">
                {!isHome && (
                  <button onClick={reset} className="h-10 px-3 rounded-xl text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 flex items-center gap-1">
                    <X className="w-3.5 h-3.5" aria-hidden="true" /> Tozalash
                  </button>
                )}
                <label className="relative">
                  <span className="sr-only">Saralash</span>
                  <select
                    value={sort}
                    onChange={(e) => chooseSort(e.target.value)}
                    className="h-10 pl-3 pr-9 rounded-xl border border-slate-200 bg-white text-sm font-medium text-[#0F172A] appearance-none outline-none focus:border-[#10B981] cursor-pointer"
                  >
                    {SORTS.map((o) => (
                      <option key={o.v} value={o.v}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-slate-500 pointer-events-none" aria-hidden="true" />
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setPriceDraft({ min: minPrice, max: maxPrice })
                      setPriceOpen((v) => !v)
                    }}
                    aria-expanded={priceOpen}
                    className={`h-10 px-3 rounded-xl border text-sm font-medium flex items-center gap-1.5 ${minPrice || maxPrice ? 'border-[#10B981] bg-[#ECFDF5] text-[#047857]' : 'border-slate-200 bg-white text-[#0F172A] hover:border-slate-300'}`}
                  >
                    <SlidersHorizontal className="w-4 h-4" aria-hidden="true" /> {priceLabel}
                  </button>
                  {priceOpen && (
                    <form onSubmit={applyPrice} className="absolute right-0 top-[calc(100%+6px)] z-30 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-4">
                      <p className="text-sm font-semibold text-[#0F172A] mb-3">Narx, so'm</p>
                      <div className="flex items-center gap-2">
                        <input inputMode="numeric" value={priceDraft.min} onChange={(e) => setPriceDraft((d) => ({ ...d, min: e.target.value.replace(/\D/g, '') }))} placeholder="dan" aria-label="Minimal narx" className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#10B981]" />
                        <span className="text-slate-400">—</span>
                        <input inputMode="numeric" value={priceDraft.max} onChange={(e) => setPriceDraft((d) => ({ ...d, max: e.target.value.replace(/\D/g, '') }))} placeholder="gacha" aria-label="Maksimal narx" className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#10B981]" />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {[[0, 1000000], [1000000, 5000000], [5000000, 15000000], [15000000, 0]].map(([lo, hi]) => (
                          <button key={`${lo}-${hi}`} type="button" onClick={() => setPriceDraft({ min: lo ? String(lo) : '', max: hi ? String(hi) : '' })} className="px-2.5 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-700 hover:bg-slate-200">
                            {lo ? `${lo / 1e6} mln` : '0'} – {hi ? `${hi / 1e6} mln` : '…'}
                          </button>
                        ))}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button type="button" onClick={() => { setPriceDraft({ min: '', max: '' }); setFilter({ min: '', max: '' }); setPriceOpen(false) }} className="flex-1 h-10 rounded-lg border border-slate-200 text-sm font-medium">
                          Bekor qilish
                        </button>
                        <button type="submit" className="flex-1 h-10 rounded-lg bg-[#047857] text-white text-sm font-semibold">
                          Qo'llash
                        </button>
                      </div>
                    </form>
                  )}
                </div>
                <button type="button" onClick={() => setShowMap(true)} className="h-10 px-3 rounded-xl border border-[#10B981]/50 bg-[#ECFDF5] text-sm font-medium text-[#047857] flex items-center gap-1.5 hover:bg-[#D1FAE5]">
                  <MapPin className="w-4 h-4" aria-hidden="true" /> Do'konlar xaritasi
                </button>
              </div>
            )}
          </div>

          {favView && fav.count === 0 ? (
            <div className="text-center py-20">
              <Heart className="w-14 h-14 mx-auto text-slate-300" aria-hidden="true" />
              <p className="mt-3 font-semibold">Saralanganlar bo'sh</p>
              <p className="text-sm text-slate-500 mt-1">Mahsulot kartochkasidagi yurakchani bosing — shu yerda saqlanadi.</p>
              <button onClick={() => setFilter({ fav: '' })} className="mt-5 h-11 px-6 rounded-xl bg-[#047857] text-white font-semibold">
                Mahsulotlarga qaytish
              </button>
            </div>
          ) : !favView && loading && !products.length ? (
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-3 gap-y-6 sm:gap-x-5" aria-busy="true">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-slate-200 p-3">
                  <div className="aspect-square rounded-xl bg-slate-100" />
                  <div className="h-5 w-2/3 bg-slate-100 rounded mt-3" />
                  <div className="h-4 w-full bg-slate-100 rounded mt-2" />
                </div>
              ))}
            </div>
          ) : shown.length === 0 ? (
            <div className="text-center py-20">
              <Package className="w-14 h-14 mx-auto text-slate-300" aria-hidden="true" />
              <p className="mt-3 font-semibold">Hech narsa topilmadi</p>
              <p className="text-sm text-slate-500 mt-1">Boshqa so'z bilan qidiring yoki kategoriyani almashtiring.</p>
              <button onClick={reset} className="mt-5 h-11 px-6 rounded-xl bg-[#047857] text-white font-semibold">
                Barcha mahsulotlar
              </button>
            </div>
          ) : (
            <div className={`mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 transition-opacity ${loading && !favView ? 'opacity-50' : ''}`}>
              {shown.map((p) => (
                <ProductCard key={p._id} product={p} onAdd={add} fav={fav.has(p._id)} onFav={fav.toggle} />
              ))}
            </div>
          )}

          {hasMore && !favView && (
            <div className="flex justify-center mt-10">
              <button onClick={loadMore} disabled={loadingMore} className="h-12 px-8 rounded-xl border border-slate-300 font-semibold hover:border-[#047857] hover:text-[#047857] transition-colors disabled:opacity-50 flex items-center gap-2">
                {loadingMore ? 'Yuklanmoqda…' : "Yana ko'rsatish"}
                {!loadingMore && <ChevronDown className="w-4 h-4" aria-hidden="true" />}
              </button>
            </div>
          )}
        </section>

        {/* Barcha do'konlar */}
        {shops.length > 0 && (
          <section className="mt-14" aria-labelledby="shops-h">
            <div className="flex items-end justify-between">
              <h2 id="shops-h" className="font-display text-xl sm:text-2xl font-bold tracking-tight">Do'konlar</h2>
              <button onClick={() => setShowMap(true)} className="text-sm font-semibold text-[#047857] flex items-center gap-1 hover:underline">
                <MapPin className="w-4 h-4" aria-hidden="true" /> Xaritada ko'rish
              </button>
            </div>
            <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {shops.slice(0, 12).map((s) => (
                <li key={s._id}>
                  <Link to={`/marketplace/shop/${s._id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F3F4F6] transition-colors">
                    <span className="w-11 h-11 rounded-xl bg-[#D1FAE5] text-[#047857] font-display font-bold flex items-center justify-center shrink-0">{s.name?.[0] || '?'}</span>
                    <span className="min-w-0">
                      <span className="block font-semibold truncate">{s.name}</span>
                      <span className="block text-xs text-slate-500 truncate">{shopAddress(s) || `${s.productCount} ta mahsulot`}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Sotuvchilar uchun */}
        <section className="mt-14 rounded-[1.75rem] bg-[#FEF3C7] text-[#111827] px-6 sm:px-12 py-10 sm:py-12 grid md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Do'koningiz bormi? Mahsulotlaringizni shu yerda soting.</h2>
            <p className="mt-2 text-[#57534E] max-w-xl">
              Malikadagi rastangizmi yoki mahalladagi do'koningizmi — OsonBiznes'da kassa, ombor va nasiyani yuritasiz, mahsulotlaringiz esa OsonBozor'da avtomatik chiqadi.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="/login?register=1" className="h-12 px-6 rounded-xl bg-[#047857] text-white font-semibold flex items-center hover:bg-[#065F46] transition-colors">
              14 kun bepul boshlash
            </a>
            <a href="/" className="h-12 px-6 rounded-xl border border-[#111827]/20 font-semibold flex items-center hover:bg-white/60">
              Batafsil
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row gap-4 justify-between text-sm text-slate-600">
          <p>© 2026 OsonBozor — OsonBiznes do'konlari bozori</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <a href="/login" className="hover:text-[#047857]">Sotuvchilar uchun</a>
            <a href="https://t.me/OSSON_BIZNES_BOT" target="_blank" rel="noopener noreferrer" className="hover:text-[#047857]">Telegram bot</a>
            <button onClick={() => setShowSupport(true)} className="hover:text-[#047857]">Yordam</button>
          </div>
        </div>
      </footer>

      {showMap && (() => {
        const mapped = shops.filter((s) => s.latitude && s.longitude)
        const center = mapped[0] || shops[0]
        const lat = Number(center?.latitude) || 41.3111
        const lng = Number(center?.longitude) || 69.2406
        const embed = (la, ln) => `https://www.openstreetmap.org/export/embed.html?bbox=${ln - 0.06}%2C${la - 0.045}%2C${ln + 0.06}%2C${la + 0.045}&layer=mapnik&marker=${la}%2C${ln}`
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true" aria-label="Do'konlar xaritasi">
            <div className="fixed inset-0 bg-black/60" onClick={() => setShowMap(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden z-10 flex flex-col animate-scale-in">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <h3 className="font-semibold">Do'konlar xaritasi</h3>
                  <p className="text-xs text-slate-500">{shops.length} ta do'kon</p>
                </div>
                <button onClick={() => setShowMap(false)} aria-label="Yopish" className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200">
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                <div className="md:w-3/5 h-[50vh] md:h-[75vh] bg-slate-100 relative">
                  <iframe id="shop-map-src" title="Do'konlar xaritasi" src={embed(lat, lng)} className="w-full h-full" loading="lazy" />
                  <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=14/${lat}/${lng}`} target="_blank" rel="noopener noreferrer" className="absolute bottom-2 right-2 text-xs bg-white shadow rounded-lg px-2.5 py-1.5 text-slate-700">
                    <ExternalLink className="w-3 h-3 inline mr-1" aria-hidden="true" /> Katta xarita
                  </a>
                </div>
                <div className="md:w-2/5 overflow-y-auto p-3 space-y-1">
                  {shops.map((s) => (
                    <div key={s._id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#F3F4F6]">
                      <button
                        type="button"
                        className="flex items-center gap-3 min-w-0 flex-1 text-left"
                        onClick={() => {
                          const el = document.querySelector('#shop-map-src')
                          if (el && s.latitude && s.longitude) el.src = embed(Number(s.latitude), Number(s.longitude))
                        }}
                      >
                        <span className="w-9 h-9 rounded-lg bg-[#D1FAE5] text-[#047857] font-bold text-sm flex items-center justify-center shrink-0">{s.name?.[0] || '?'}</span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold truncate">{s.name}</span>
                          <span className="block text-xs text-slate-500 truncate">{shopAddress(s) || 'Manzil kiritilmagan'}</span>
                        </span>
                      </button>
                      <Link to={`/marketplace/shop/${s._id}`} className="text-xs font-semibold text-[#047857] shrink-0 hover:underline">
                        Kirish
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      <MarketplaceCartModal isOpen={showCart} onClose={() => setShowCart(false)} cart={cart} onUpdateQty={updateCartQty} onRemoveItem={removeFromCart} onClearCart={clearCart} />
      <SupportModal isOpen={showSupport} onClose={() => setShowSupport(false)} />
    </div>
  )
}
