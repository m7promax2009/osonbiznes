import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, BadgeCheck, Flame, Sparkles } from 'lucide-react'
import { resolveImageUrl } from '../services/api'

// OsonBozor bosh banneri — faqat haqiqiy ma'lumot: kategoriya statistikasi (nechta, nechta do'konda, eng arzon narx),
// tavsiya etilgan do'konlar va ularning mahsulotlari, sotuvchilar uchun taklif. Yonida: "kam qoldi" va "yangi" kartochkalari.

// Ranglar logotipdan: yalpiz (do'kon), osmon (oyna), pushti va sariq (xaridorlar)
const THEMES = [
  { bg: '#D1FAE5', chip: '#A7F3D0', btn: '#047857', blob: '#6EE7B7' },
  { bg: '#E0F2FE', chip: '#BAE6FD', btn: '#0369A1', blob: '#7DD3FC' },
  { bg: '#FCE7F3', chip: '#FBCFE8', btn: '#BE185D', blob: '#F9A8D4' },
  { bg: '#FEF3C7', chip: '#FDE68A', btn: '#B45309', blob: '#FCD34D' },
]

const fmt = (p) => new Intl.NumberFormat('ru-RU').format(p || 0)
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function SideCard({ to, tone, icon: Icon, label, product }) {
  return (
    <Link to={to} className="group relative flex-1 min-h-[9.5rem] rounded-[1.5rem] overflow-hidden p-5 flex flex-col justify-between" style={{ background: tone }}>
      <div className="relative z-10 max-w-[58%]">
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#111827]/70">
          <Icon className="w-4 h-4" aria-hidden="true" /> {label}
        </span>
        <p className="mt-1.5 font-semibold text-[#111827] leading-snug line-clamp-2">{product.name}</p>
      </div>
      <p className="relative z-10 font-display font-bold text-lg text-[#111827]">{fmt(product.price)} so'm</p>
      <img
        src={resolveImageUrl(product.images?.[0])}
        alt=""
        aria-hidden="true"
        className="absolute -right-3 -bottom-4 w-[52%] h-[110%] object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-2"
      />
    </Link>
  )
}

export default function MarketplaceBanner({ featuredShops = [], categories = [], products = [], onOpenShop, onCategory, onSell }) {
  const slides = useMemo(() => {
    const out = []
    const catSlide = (c) => {
      const imgs = (c.images?.length ? c.images : products.filter((p) => p.category === c.name).map((p) => p.images?.[0])).filter(Boolean).slice(0, 3)
      if (!imgs.length) return
      out.push({
        key: `cat-${c.name}`,
        kicker: 'Narxlarni solishtiring',
        title: c.name,
        chips: [`${c.count} ta mahsulot`, c.shopCount ? `${c.shopCount} ta do'konda` : null, c.minPrice ? `${fmt(c.minPrice)} so'mdan` : null].filter(Boolean),
        cta: "Ko'rish",
        imgs,
        onClick: () => onCategory?.(c.name),
      })
    }
    const shopSlide = (s) => {
      const imgs = (s.previewProducts || []).map((p) => p.image).filter(Boolean)
      if (!imgs.length) return
      out.push({
        key: `shop-${s._id}`,
        kicker: s.isVerified ? "Tasdiqlangan do'kon" : "Tavsiya etilgan do'kon",
        verified: s.isVerified,
        title: s.name,
        chips: [[s.city, s.address].filter(Boolean).join(', '), `${s.productCount} ta mahsulot`].filter(Boolean),
        cta: "Do'konga kirish",
        imgs,
        price: s.previewProducts?.[0]?.price,
        onClick: () => onOpenShop?.(s._id),
      })
    }
    // Kategoriya va do'kon slaydlari aralash
    const cats = categories.slice(0, 3)
    const shops = featuredShops.slice(0, 3)
    for (let i = 0; i < Math.max(cats.length, shops.length); i++) {
      if (cats[i]) catSlide(cats[i])
      if (shops[i]) shopSlide(shops[i])
    }
    out.push({
      key: 'sell',
      kicker: 'Sotuvchilar uchun',
      title: "Do'koningizni onlayn oching",
      chips: ['14 kun bepul', 'Komissiyasiz'],
      cta: "Do'kon ochish",
      imgs: products.map((p) => p.images?.[0]).filter(Boolean).slice(6, 9),
      onClick: () => onSell?.(),
    })
    return out
  }, [featuredShops, categories, products, onOpenShop, onCategory, onSell])

  // Yon kartochkalar: eng kam qolgan va eng yangi mahsulot (real ma'lumot)
  const lowStock = useMemo(() => products.filter((p) => p.stock > 0 && p.stock <= 3 && p.images?.[0]).sort((a, b) => b.price - a.price)[0], [products])
  const newest = useMemo(
    () => [...products].filter((p) => p.images?.[0] && p._id !== lowStock?._id).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0],
    [products, lowStock]
  )

  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const n = slides.length
  const go = useCallback((d) => setIdx((i) => (i + d + n) % n), [n])

  useEffect(() => {
    if (idx >= n) setIdx(0)
  }, [n, idx])

  useEffect(() => {
    if (paused || n < 2 || reduced()) return undefined
    const t = setInterval(() => go(1), 5500)
    return () => clearInterval(t)
  }, [paused, n, go])

  const startX = useRef(null)
  const onPointerDown = (e) => {
    startX.current = e.clientX
  }
  const onPointerUp = (e) => {
    if (startX.current == null) return
    const dx = e.clientX - startX.current
    startX.current = null
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
  }

  if (!n) return null
  const th = THEMES[idx % THEMES.length]

  return (
    <div className="grid lg:grid-cols-[minmax(0,2.15fr)_minmax(0,1fr)] gap-3 sm:gap-4">
      <section
        aria-roledescription="carousel"
        aria-label="OsonBozor takliflari"
        className="relative overflow-hidden rounded-[1.75rem] select-none transition-colors duration-700"
        style={{ background: th.bg }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <div className="flex transition-transform duration-700 ease-[cubic-bezier(.2,.8,.2,1)]" style={{ transform: `translateX(-${idx * 100}%)` }}>
          {slides.map((s, i) => {
            const t = THEMES[i % THEMES.length]
            const active = i === idx
            return (
              <div
                key={s.key}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} / ${n}`}
                aria-hidden={!active}
                className="relative w-full shrink-0 overflow-hidden min-h-[15rem] sm:min-h-[20rem] lg:min-h-[21.5rem] px-5 sm:px-10 pt-6 sm:pt-10 pb-12"
              >
                {/* Fon dog'i */}
                <span className="absolute -right-16 -top-20 w-[26rem] h-[26rem] rounded-full opacity-60" style={{ background: t.blob }} aria-hidden="true" />

                {/* Rasmlar: katta, chetdan chiqib turadi, biroz qiyshiq */}
                <div className="absolute inset-y-0 right-0 w-[48%] sm:w-[52%]" aria-hidden="true">
                  {s.imgs[1] && (
                    <img src={resolveImageUrl(s.imgs[1])} alt="" draggable="false" className={`banner-img absolute right-[44%] bottom-6 w-[46%] h-[52%] object-contain mix-blend-multiply ${active ? 'is-in' : ''}`} style={{ '--d': '220ms', '--r': '-8deg' }} />
                  )}
                  {s.imgs[2] && (
                    <img src={resolveImageUrl(s.imgs[2])} alt="" draggable="false" className={`banner-img hidden sm:block absolute right-[2%] top-4 w-[34%] h-[40%] object-contain mix-blend-multiply ${active ? 'is-in' : ''}`} style={{ '--d': '340ms', '--r': '10deg' }} />
                  )}
                  {s.imgs[0] && (
                    <img src={resolveImageUrl(s.imgs[0])} alt="" draggable="false" className={`banner-img absolute -right-[6%] -bottom-[8%] w-[78%] h-[86%] object-contain mix-blend-multiply ${active ? 'is-in' : ''}`} style={{ '--d': '80ms', '--r': '-3deg' }} />
                  )}
                </div>

                <div className={`relative z-10 max-w-[56%] sm:max-w-[50%] ${active ? 'banner-in' : ''}`}>
                  <p className="text-xs sm:text-sm font-semibold text-[#111827]/65 flex items-center gap-1">
                    {s.verified && <BadgeCheck className="w-4 h-4" aria-hidden="true" />}
                    {s.kicker}
                  </p>
                  <h2 className="font-display font-bold text-[1.7rem] sm:text-[2.6rem] lg:text-[3.1rem] leading-[1.02] tracking-tight mt-2 text-[#111827]">{s.title}</h2>
                  <ul className="mt-3 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2">
                    {s.chips.map((c) => (
                      <li key={c} className="px-2.5 py-1 rounded-full text-[12px] sm:text-[13px] font-semibold text-[#111827] max-w-full truncate" style={{ background: t.chip }}>
                        {c}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    tabIndex={active ? 0 : -1}
                    onClick={s.onClick}
                    className="mt-5 sm:mt-7 h-10 sm:h-12 px-5 sm:px-7 rounded-xl font-semibold text-sm sm:text-base text-white transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111827]"
                    style={{ background: t.btn }}
                  >
                    {s.cta}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {n > 1 && (
          <div className="absolute bottom-4 left-5 sm:left-10 right-4 flex items-center gap-3 z-10">
            <div className="flex gap-1.5">
              {slides.map((s, i) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setIdx(i)}
                  aria-label={`${i + 1}-slayd`}
                  aria-current={i === idx}
                  className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-7 bg-[#111827]' : 'w-2.5 bg-[#111827]/25 hover:bg-[#111827]/50'}`}
                />
              ))}
            </div>
            <div className="ml-auto hidden md:flex gap-2">
              <button type="button" onClick={() => go(-1)} aria-label="Oldingi" className="w-10 h-10 rounded-full bg-white/90 text-[#111827] shadow-sm flex items-center justify-center hover:bg-white">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button type="button" onClick={() => go(1)} aria-label="Keyingi" className="w-10 h-10 rounded-full bg-white/90 text-[#111827] shadow-sm flex items-center justify-center hover:bg-white">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </section>

      {(lowStock || newest) && (
        <div className="hidden lg:flex flex-col gap-4">
          {lowStock && <SideCard to={`/marketplace/product/${lowStock._id}`} tone="#FFE4DE" icon={Flame} label={`Faqat ${lowStock.stock} ta qoldi`} product={lowStock} />}
          {newest && <SideCard to={`/marketplace/product/${newest._id}`} tone="#E0F2FE" icon={Sparkles} label="Yangi qo'shildi" product={newest} />}
        </div>
      )}
    </div>
  )
}
