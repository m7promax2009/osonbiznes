import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, ShoppingBag, Store, MapPin, X, Loader2, Heart, LayoutGrid, LocateFixed, ChevronDown, LogIn } from 'lucide-react'
import api, { resolveImageUrl } from '../services/api'
import { recordInterest } from '../services/interests'

const fmt = (p) => new Intl.NumberFormat('ru-RU').format(p || 0) + " so'm"

// OsonBozor umumiy header'i: asl logo, jonli qidiruv (yozish bilan natija chiqadi), savat.
// onSearchChange berilsa (bozor sahifasi) — grid o'zi yangilanadi; berilmasa — faqat taklif ro'yxati.
export default function MarketHeader({
  search,
  onSearchChange,
  onSearchSubmit,
  cartCount = 0,
  onCart,
  onMap,
  favCount = 0,
  onFavorites,
  cities = [],
  city = '',
  onCity,
  near,
  nearStatus,
  onLocate,
  categories = [],
  onCategory,
}) {
  const navigate = useNavigate()
  const [local, setLocal] = useState(search ?? '')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hits, setHits] = useState([])
  const [active, setActive] = useState(-1)
  const [catalog, setCatalog] = useState(false)
  const boxRef = useRef(null)
  const catRef = useRef(null)
  const value = onSearchChange ? search ?? '' : local

  // Tashqariga bosilsa ro'yxat yopiladi
  useEffect(() => {
    const close = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
      if (catRef.current && !catRef.current.contains(e.target)) setCatalog(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])

  // Taklif ro'yxati: 250 ms kutib, 6 ta mahsulot
  useEffect(() => {
    const q = value.trim()
    if (q.length < 2) {
      setHits([])
      return undefined
    }
    let alive = true
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await api.getMarketplaceProducts({ search: q, limit: 6, sort: 'recommended' })
        if (alive) {
          setHits(res.data || [])
          setActive(-1)
        }
      } catch {
        if (alive) setHits([])
      } finally {
        if (alive) setLoading(false)
      }
    }, 250)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [value])

  const change = (v) => {
    if (onSearchChange) onSearchChange(v)
    else setLocal(v)
    setOpen(true)
  }

  const submit = (e) => {
    e?.preventDefault()
    if (active >= 0 && hits[active]) return openHit(hits[active])
    const q = value.trim()
    if (q.length >= 2) recordInterest(q, 3)
    setOpen(false)
    onSearchSubmit?.(q)
  }

  const openHit = (p) => {
    recordInterest(value.trim(), 3)
    setOpen(false)
    navigate(`/marketplace/product/${p._id}`)
  }

  const onKey = (e) => {
    if (!open || !hits.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(hits.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(-1, i - 1))
    } else if (e.key === 'Escape') setOpen(false)
  }

  const showList = open && value.trim().length >= 2

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      {/* Yordamchi qator: shahar, yaqin do'konlar, sotuvchilar */}
      <div className="bg-[#F8FAFC] border-b border-slate-200/70 text-[13px]">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center gap-4">
          <label className="relative flex items-center gap-1 text-slate-700 font-medium cursor-pointer">
            <MapPin className="w-4 h-4 text-[#10B981]" aria-hidden="true" />
            <select
              value={city}
              onChange={(e) => onCity?.(e.target.value)}
              aria-label="Shahar"
              className="appearance-none bg-transparent pr-4 outline-none cursor-pointer"
            >
              <option value="">Butun O'zbekiston</option>
              {cities.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-0 pointer-events-none text-slate-500" aria-hidden="true" />
          </label>
          {onLocate && (
            <button type="button" onClick={onLocate} className={`flex items-center gap-1 font-medium truncate ${near ? 'text-[#047857]' : 'text-slate-600 hover:text-[#047857]'}`}>
              {nearStatus === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" aria-hidden="true" />}
              <span className="truncate">
                {near ? "Yaqin do'konlar ko'rsatilmoqda" : nearStatus === 'denied' ? 'Joylashuvga ruxsat berilmadi' : "Yaqin do'konlarni ko'rish"}
              </span>
            </button>
          )}
          <div className="ml-auto hidden sm:flex items-center gap-4">
            <a href="/login?register=1" className="font-medium text-[#047857] hover:underline">Sotuvchi bo'lish</a>
            <a href="/login" className="text-slate-600 hover:text-[#0F172A] flex items-center gap-1">
              <LogIn className="w-3.5 h-3.5" aria-hidden="true" /> Do'kon egasi kirishi
            </a>
          </div>
        </div>
      </div>
      <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap md:flex-nowrap items-center gap-x-4 lg:gap-x-8 gap-y-2 py-2.5 md:h-[4.5rem] md:py-0">
          <Link to="/marketplace" className="shrink-0 flex items-center" aria-label="OsonBozor bosh sahifasi">
            <img src="/images/osonbozor-logo.png" alt="OsonBozor" width="507" height="120" className="hidden sm:block h-10 lg:h-11 w-auto" />
            <img src="/images/osonbozor-icon.png" alt="OsonBozor" width="40" height="40" className="sm:hidden w-10 h-10" />
          </Link>

          {categories.length > 0 && (
            <div ref={catRef} className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setCatalog((v) => !v)}
                aria-expanded={catalog}
                className={`h-11 px-4 rounded-xl font-semibold text-sm flex items-center gap-2 transition-colors ${catalog ? 'bg-[#047857] text-white' : 'bg-[#ECFDF5] text-[#047857] hover:bg-[#D1FAE5]'}`}
              >
                {catalog ? <X className="w-[18px] h-[18px]" /> : <LayoutGrid className="w-[18px] h-[18px]" />} Katalog
              </button>
              {catalog && (
                <div className="absolute left-0 top-[calc(100%+8px)] w-[22rem] bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50">
                  {categories.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => {
                        setCatalog(false)
                        onCategory?.(c.name)
                      }}
                      className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-[#F8FAFC] text-left"
                    >
                      <span className="w-10 h-10 rounded-lg bg-[#F1F5F9] overflow-hidden shrink-0">
                        {c.image && <img src={resolveImageUrl(c.image)} alt="" className="w-full h-full object-contain p-1 mix-blend-multiply" />}
                      </span>
                      <span className="flex-1 text-sm font-medium text-[#0F172A]">{c.name}</span>
                      <span className="text-xs text-slate-500">{c.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div ref={boxRef} className="relative order-last md:order-none basis-full md:basis-auto flex-1 max-w-2xl">
            <form onSubmit={submit} role="search">
              <label className="flex items-center h-11 rounded-xl bg-[#F3F4F6] border-2 border-transparent focus-within:border-[#10B981] focus-within:bg-white transition-colors">
                <Search className="w-[18px] h-[18px] ml-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                <input
                  type="text"
                  enterKeyHint="search"
                  value={value}
                  onChange={(e) => change(e.target.value)}
                  onFocus={() => setOpen(true)}
                  onKeyDown={onKey}
                  placeholder="Telefon, soat, atir yoki do'kon nomi"
                  aria-label="Qidiruv"
                  role="combobox"
                  aria-expanded={showList}
                  aria-controls="search-suggest"
                  aria-autocomplete="list"
                  className="flex-1 min-w-0 bg-transparent px-3 text-[15px] text-[#111827] placeholder:text-slate-500 outline-none"
                />
                {loading && <Loader2 className="w-4 h-4 mr-2 text-slate-400 animate-spin" aria-hidden="true" />}
                {value && (
                  <button type="button" onClick={() => change('')} aria-label="Tozalash" className="w-8 h-8 mr-1 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </label>
            </form>

            {showList && (
              <div id="search-suggest" role="listbox" className="absolute left-0 right-0 top-[calc(100%+6px)] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50">
                {hits.length === 0 && !loading ? (
                  <p className="px-4 py-5 text-sm text-slate-500">"{value.trim()}" bo'yicha hech narsa topilmadi</p>
                ) : (
                  <ul className="py-1.5">
                    {hits.map((p, i) => (
                      <li key={p._id} role="option" aria-selected={i === active}>
                        <button
                          type="button"
                          onMouseEnter={() => setActive(i)}
                          onClick={() => openHit(p)}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-left ${i === active ? 'bg-[#ECFDF5]' : ''}`}
                        >
                          <span className="w-11 h-11 rounded-lg bg-[#F3F4F6] shrink-0 overflow-hidden">
                            {p.images?.[0] && <img src={resolveImageUrl(p.images[0])} alt="" className="w-full h-full object-contain p-1 mix-blend-multiply" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm text-[#111827] truncate">{p.name}</span>
                            <span className="block text-xs text-slate-500 truncate">{p.shopName}</span>
                          </span>
                          <span className="text-sm font-semibold text-[#111827] shrink-0">{fmt(p.price)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button type="button" onClick={submit} className="w-full px-4 py-3 text-sm font-semibold text-[#047857] border-t border-slate-100 text-left hover:bg-[#ECFDF5]">
                  Barcha natijalar: "{value.trim()}"
                </button>
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            {onMap && (
              <button type="button" onClick={onMap} className="hidden lg:flex items-center gap-1.5 h-10 px-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100">
                <MapPin className="w-[18px] h-[18px]" aria-hidden="true" /> Do'konlar xaritasi
              </button>
            )}
            {onFavorites && (
              <button type="button" onClick={onFavorites} className="relative flex items-center gap-1.5 h-10 px-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100" aria-label={`Saralangan, ${favCount} ta`}>
                <Heart className="w-5 h-5" aria-hidden="true" />
                <span className="hidden lg:inline">Saralangan</span>
                {favCount > 0 && (
                  <span className="absolute -top-0.5 left-6 min-w-[1.15rem] h-[1.15rem] px-1 rounded-full bg-[#F43F5E] text-white text-[11px] font-bold flex items-center justify-center">{favCount}</span>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onCart}
              className="relative flex items-center gap-1.5 h-10 px-3 rounded-xl text-sm font-semibold text-[#111827] hover:bg-slate-100"
              aria-label={`Savat, ${cartCount} ta mahsulot`}
            >
              <ShoppingBag className="w-5 h-5" aria-hidden="true" />
              <span className="hidden sm:inline">Savat</span>
              {cartCount > 0 && (
                <span className="absolute -top-0.5 left-6 min-w-[1.15rem] h-[1.15rem] px-1 rounded-full bg-[#10B981] text-white text-[11px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
