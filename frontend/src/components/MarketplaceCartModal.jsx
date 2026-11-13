import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { ShoppingBag, X, Trash2, Plus, Minus, Check, Store, Truck, AlertCircle, ArrowLeft, Wallet, CreditCard, Smartphone, MapPin } from 'lucide-react'
import api, { resolveImageUrl } from '../services/api'
import sounds from '../utils/audio'
import { toast } from './Toast'

const LocationPicker = lazy(() => import('./LocationPicker'))

// Viloyat markazlari (xaritani boshlash uchun)
const REGIONS = [
  ['Toshkent shahri', 41.3111, 69.2797],
  ['Toshkent viloyati', 41.0, 69.6],
  ['Andijon', 40.7821, 72.3442],
  ['Buxoro', 39.7681, 64.4556],
  ["Farg'ona", 40.3864, 71.7864],
  ['Jizzax', 40.1158, 67.8422],
  ['Xorazm', 41.55, 60.6333],
  ['Namangan', 40.9983, 71.6726],
  ['Navoiy', 40.0844, 65.3792],
  ['Qashqadaryo', 38.8606, 65.7975],
  ["Qoraqalpog'iston", 42.4611, 59.6166],
  ['Samarqand', 39.6542, 66.9597],
  ['Sirdaryo', 40.4897, 68.7842],
  ['Surxondaryo', 37.2242, 67.2783],
]
const TASHKENT_DISTRICTS = ['Bektemir', 'Chilonzor', 'Mirobod', "Mirzo Ulug'bek", 'Olmazor', 'Sergeli', 'Shayxontohur', 'Uchtepa', 'Yakkasaroy', 'Yangihayot', 'Yashnobod', 'Yunusobod']

const PAY = [
  { key: 'cash', label: 'Naqd', icon: Wallet },
  { key: 'card', label: 'Karta', icon: CreditCard },
  { key: 'click', label: 'Click / Payme', icon: Smartphone },
]

const fmt = (p) => new Intl.NumberFormat('ru-RU').format(p || 0) + " so'm"
// Faqat raqam; 998 bilan yopishtirilsa — prefiks olib tashlanadi; maksimal 9 ta
const onlyPhoneDigits = (v) => {
  let d = String(v || '').replace(/\D/g, '')
  if (d.length > 9 && d.startsWith('998')) d = d.slice(3)
  return d.slice(0, 9)
}
const prettyPhone = (d) => [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ')

const fieldCls = 'w-full h-12 rounded-xl border border-slate-300 bg-white px-3.5 text-[15px] text-[#111827] placeholder:text-slate-400 outline-none focus:border-[#10B981] focus:ring-4 focus:ring-[#D1FAE5] transition'
const labelCls = 'block text-sm font-medium text-slate-700 mb-1.5'

const EMPTY_ADDR = { city: 'Toshkent shahri', district: '', street: '', house: '', apartment: '', landmark: '' }

export default function MarketplaceCartModal({ isOpen, onClose, cart = [], onUpdateQty, onRemoveItem, onClearCart }) {
  const [step, setStep] = useState(1) // 1 savat, 2 rasmiylashtirish, 3 tayyor
  const [customer, setCustomer] = useState('')
  const [phone, setPhone] = useState('')
  const [delivery, setDelivery] = useState('delivery')
  const [pay, setPay] = useState('cash')
  const [addr, setAddr] = useState(EMPTY_ADDR)
  const [location, setLocation] = useState(null)
  const [touched, setTouched] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return undefined
    const onEsc = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onEsc)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = prev
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen && step === 3 && cart.length) setStep(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const groups = useMemo(() => {
    const g = {}
    cart.forEach((i) => {
      const id = i.shopId || 'unknown'
      ;(g[id] ||= { shopName: i.shopName || "Do'kon", items: [] }).items.push(i)
    })
    return g
  }, [cart])

  const regionCenter = useMemo(() => {
    const r = REGIONS.find((x) => x[0] === addr.city)
    return r ? { lat: r[1], lng: r[2] } : null
  }, [addr.city])

  if (!isOpen) return null

  const shopCount = Object.keys(groups).length
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const count = cart.reduce((s, i) => s + i.qty, 0)
  const setA = (k) => (e) => setAddr((a) => ({ ...a, [k]: e.target.value }))

  // Tekshiruv
  const errs = {}
  if (customer.trim().length < 2) errs.customer = 'Ismingizni yozing'
  if (phone.length !== 9) errs.phone = 'Raqam 9 ta raqamdan iborat: 90 123 45 67'
  if (delivery === 'delivery') {
    if (!addr.district.trim()) errs.district = 'Tumanni tanlang'
    if (addr.street.trim().length < 3) errs.street = "Ko'cha yoki mahalla nomini yozing"
    if (!addr.house.trim()) errs.house = 'Uy raqami'
    if (!location) errs.location = 'Xaritada yetkazish nuqtasini belgilang'
  }
  const err = (k) => touched && errs[k]

  const submit = async (e) => {
    e.preventDefault()
    setTouched(true)
    setError('')
    if (Object.keys(errs).length) {
      setError(errs.location && Object.keys(errs).length === 1 ? errs.location : "Belgilangan maydonlarni to'ldiring")
      // Birinchi xato maydonga olib boramiz
      setTimeout(() => {
        const first = document.querySelector('[aria-invalid="true"]') || document.querySelector('.leaflet-container')
        first?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        if (first?.focus && first.tagName !== 'DIV') first.focus({ preventScroll: true })
      }, 0)
      return
    }
    setProcessing(true)
    sounds.playClick()
    const created = []
    const failed = []
    for (const [shopId, g] of Object.entries(groups)) {
      try {
        const res = await api.request('/telegram/order', {
          method: 'POST',
          body: {
            customer: customer.trim(),
            phone: `+998${phone}`,
            items: g.items.map((i) => ({ productId: i.productId || i._id, name: i.name, qty: i.qty })),
            source: 'website',
            ownerId: shopId,
            deliveryMethod: delivery,
            paymentMethod: pay,
            ...(delivery === 'delivery' ? { addressDetails: addr, location } : {}),
          },
        })
        created.push({ shopName: g.shopName, orderId: res.data?.orderNumber || res.data?.orderId, total: res.data?.total ?? 0 })
        g.sent = true
      } catch (err2) {
        failed.push(`${g.shopName}: ${err2.message}`)
      }
    }
    setProcessing(false)
    if (!created.length) {
      setError(failed.join('\n') || 'Buyurtma yuborilmadi')
      return
    }
    sounds.playCashChing()
    setResults(created)
    if (!failed.length) onClearCart()
    else Object.values(groups).filter((g) => g.sent).forEach((g) => g.items.forEach((i) => onRemoveItem(i.productId || i._id)))
    setStep(3)
    if (failed.length) toast.error(`Ba'zi do'konlarga yuborilmadi:\n${failed.join('\n')}`)
  }

  const title = step === 1 ? 'Savat' : step === 2 ? 'Buyurtmani rasmiylashtirish' : 'Buyurtma yuborildi'

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-[#111827]/50 animate-fade-in" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full sm:w-[34rem] bg-white shadow-2xl flex flex-col drawer-in">
        <header className="h-16 shrink-0 px-4 sm:px-6 flex items-center gap-3 border-b border-slate-200">
          {step === 2 && (
            <button type="button" onClick={() => setStep(1)} aria-label="Savatga qaytish" className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center hover:bg-slate-100">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="font-display font-bold text-lg text-[#111827] flex-1 truncate">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Yopish" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </header>

        {step === 1 && (
          <>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
              {cart.length === 0 ? (
                <div className="py-20 text-center">
                  <span className="w-16 h-16 mx-auto rounded-2xl bg-[#ECFDF5] flex items-center justify-center">
                    <ShoppingBag className="w-8 h-8 text-[#10B981]" />
                  </span>
                  <p className="mt-4 font-semibold text-[#111827]">Savat bo'sh</p>
                  <p className="text-sm text-slate-500 mt-1">Mahsulot kartochkasidagi "Savatga" tugmasini bosing.</p>
                  <button type="button" onClick={onClose} className="mt-6 h-11 px-6 rounded-xl bg-[#047857] text-white font-semibold">
                    Xaridni boshlash
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {shopCount > 1 && (
                    <p className="text-sm text-slate-600 bg-[#E0F2FE] rounded-xl px-3.5 py-2.5">
                      {shopCount} ta do'kondan tanladingiz — har bir do'kon o'z buyurtmasini alohida yuboradi.
                    </p>
                  )}
                  {Object.entries(groups).map(([sid, g]) => (
                    <section key={sid}>
                      <h3 className="text-sm font-semibold text-[#111827] flex items-center gap-1.5 mb-2">
                        <Store className="w-4 h-4 text-[#10B981]" aria-hidden="true" /> {g.shopName}
                      </h3>
                      <ul className="divide-y divide-slate-100">
                        {g.items.map((i) => {
                          const id = i.productId || i._id
                          return (
                            <li key={id} className="py-3 flex gap-3">
                              <span className="w-16 h-16 rounded-xl bg-[#F3F4F6] overflow-hidden shrink-0">
                                {i.images?.[0] && <img src={resolveImageUrl(i.images[0])} alt="" className="w-full h-full object-contain p-1.5 mix-blend-multiply" />}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-[#111827] line-clamp-2">{i.name}</p>
                                <p className="mt-0.5 font-semibold text-[#111827]">{fmt(i.price * i.qty)}</p>
                                <div className="mt-2 flex items-center gap-2">
                                  <div className="flex items-center h-8 rounded-lg border border-slate-200">
                                    <button type="button" onClick={() => onUpdateQty(id, -1)} aria-label="Kamaytirish" className="w-8 h-full flex items-center justify-center hover:bg-slate-50">
                                      <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="w-7 text-center text-sm font-semibold tabular-nums">{i.qty}</span>
                                    <button
                                      type="button"
                                      onClick={() => onUpdateQty(id, 1)}
                                      disabled={i.stock != null && i.qty >= i.stock}
                                      aria-label="Ko'paytirish"
                                      className="w-8 h-full flex items-center justify-center hover:bg-slate-50 disabled:opacity-30"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <button type="button" onClick={() => onRemoveItem(id)} aria-label="O'chirish" className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#B91C1C] hover:bg-red-50">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>
            {cart.length > 0 && (
              <footer className="shrink-0 border-t border-slate-200 px-4 sm:px-6 py-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-sm text-slate-600">{count} ta mahsulot</span>
                  <span className="font-display font-bold text-xl text-[#111827]">{fmt(total)}</span>
                </div>
                <button type="button" onClick={() => setStep(2)} className="w-full h-12 rounded-xl bg-[#047857] text-white font-semibold hover:bg-[#065F46] transition-colors">
                  Rasmiylashtirishga o'tish
                </button>
              </footer>
            )}
          </>
        )}

        {step === 2 && (
          <form onSubmit={submit} noValidate className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-6">
              <fieldset>
                <legend className="font-semibold text-[#111827] mb-2.5">Qanday olasiz?</legend>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { k: 'delivery', icon: Truck, t: 'Yetkazib berish', d: "Kuryer (Yandex Go va h.k.) — narxini kuryerga to'laysiz" },
                    { k: 'pickup', icon: Store, t: "Do'kondan olish", d: 'Bepul, tayyor bo\'lganda xabar beriladi' },
                  ].map((o) => (
                    <label key={o.k} className={`cursor-pointer rounded-2xl border-2 p-3.5 transition-colors ${delivery === o.k ? 'border-[#10B981] bg-[#ECFDF5]' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input type="radio" name="delivery" value={o.k} checked={delivery === o.k} onChange={() => setDelivery(o.k)} className="sr-only" />
                      <o.icon className={`w-5 h-5 ${delivery === o.k ? 'text-[#047857]' : 'text-slate-500'}`} aria-hidden="true" />
                      <span className="block mt-2 text-sm font-semibold text-[#111827]">{o.t}</span>
                      <span className="block mt-0.5 text-xs text-slate-500 leading-snug">{o.d}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="font-semibold text-[#111827] mb-2.5">Qabul qiluvchi</legend>
                <div>
                  <label htmlFor="co-name" className={labelCls}>Ism</label>
                  <input id="co-name" value={customer} onChange={(e) => setCustomer(e.target.value.slice(0, 60))} autoComplete="name" placeholder="Sardor" className={fieldCls} aria-invalid={!!err('customer')} />
                  {err('customer') && <p className="mt-1 text-xs text-[#B91C1C]">{errs.customer}</p>}
                </div>
                <div>
                  <label htmlFor="co-phone" className={labelCls}>Telefon</label>
                  <div className={`flex items-center h-12 rounded-xl border bg-white focus-within:border-[#10B981] focus-within:ring-4 focus-within:ring-[#D1FAE5] transition ${err('phone') ? 'border-[#B91C1C]' : 'border-slate-300'}`}>
                    <span className="pl-3.5 pr-2 text-[15px] font-medium text-slate-500 select-none">+998</span>
                    <input
                      id="co-phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      value={prettyPhone(phone)}
                      onChange={(e) => setPhone(onlyPhoneDigits(e.target.value))}
                      onPaste={(e) => {
                        e.preventDefault()
                        setPhone(onlyPhoneDigits(e.clipboardData.getData('text')))
                      }}
                      onKeyDown={(e) => {
                        if (e.key.length === 1 && !/\d/.test(e.key) && !e.metaKey && !e.ctrlKey) e.preventDefault()
                      }}
                      placeholder="90 123 45 67"
                      maxLength={12}
                      className="flex-1 min-w-0 h-full bg-transparent pr-3.5 text-[15px] tracking-wide text-[#111827] placeholder:text-slate-400 outline-none tabular-nums"
                      aria-invalid={!!err('phone')}
                    />
                    <span className={`pr-3.5 text-xs tabular-nums ${phone.length === 9 ? 'text-[#047857]' : 'text-slate-400'}`}>{phone.length}/9</span>
                  </div>
                  {err('phone') && <p className="mt-1 text-xs text-[#B91C1C]">{errs.phone}</p>}
                </div>
              </fieldset>

              {delivery === 'delivery' && (
                <fieldset className="space-y-3">
                  <legend className="font-semibold text-[#111827] mb-2.5">Yetkazish manzili</legend>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="co-city" className={labelCls}>Hudud</label>
                      <select id="co-city" value={addr.city} onChange={(e) => setAddr((a) => ({ ...a, city: e.target.value, district: '' }))} className={fieldCls}>
                        {REGIONS.map(([r]) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="co-district" className={labelCls}>Tuman</label>
                      {addr.city === 'Toshkent shahri' ? (
                        <select id="co-district" value={addr.district} onChange={setA('district')} className={fieldCls} aria-invalid={!!err('district')}>
                          <option value="">Tanlang</option>
                          {TASHKENT_DISTRICTS.map((d) => (
                            <option key={d}>{d}</option>
                          ))}
                        </select>
                      ) : (
                        <input id="co-district" value={addr.district} onChange={setA('district')} placeholder="Tuman yoki shahar" className={fieldCls} aria-invalid={!!err('district')} />
                      )}
                      {err('district') && <p className="mt-1 text-xs text-[#B91C1C]">{errs.district}</p>}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="co-street" className={labelCls}>Ko'cha yoki mahalla</label>
                    <input id="co-street" value={addr.street} onChange={setA('street')} autoComplete="address-line1" placeholder="Bunyodkor ko'chasi" className={fieldCls} aria-invalid={!!err('street')} />
                    {err('street') && <p className="mt-1 text-xs text-[#B91C1C]">{errs.street}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="co-house" className={labelCls}>Uy</label>
                      <input id="co-house" value={addr.house} onChange={setA('house')} placeholder="12" className={fieldCls} aria-invalid={!!err('house')} />
                      {err('house') && <p className="mt-1 text-xs text-[#B91C1C]">{errs.house}</p>}
                    </div>
                    <div>
                      <label htmlFor="co-apt" className={labelCls}>Xonadon <span className="text-slate-400 font-normal">(ixtiyoriy)</span></label>
                      <input id="co-apt" value={addr.apartment} onChange={setA('apartment')} placeholder="45" className={fieldCls} />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="co-landmark" className={labelCls}>Mo'ljal <span className="text-slate-400 font-normal">(ixtiyoriy)</span></label>
                    <input id="co-landmark" value={addr.landmark} onChange={setA('landmark')} placeholder="Korzinka yonida, 3-podyezd" className={fieldCls} />
                  </div>
                  <div>
                    <p className={labelCls}>
                      <MapPin className="w-4 h-4 inline -mt-0.5 mr-1 text-[#F97362]" aria-hidden="true" />
                      Xaritadagi nuqta — kuryer aynan shu yerga keladi
                    </p>
                    <Suspense fallback={<div className="h-56 sm:h-64 rounded-2xl bg-slate-100 animate-pulse" />}>
                      <LocationPicker value={location} onChange={setLocation} center={regionCenter} />
                    </Suspense>
                    {location && <p className="mt-1.5 text-xs text-[#047857]">Nuqta belgilandi. Kerak bo'lsa markerni surib aniqlashtiring.</p>}
                    {err('location') && <p className="mt-1.5 text-xs text-[#B91C1C]">{errs.location}</p>}
                  </div>
                </fieldset>
              )}

              <fieldset>
                <legend className="font-semibold text-[#111827] mb-1">To'lov</legend>
                <p className="text-xs text-slate-500 mb-2.5">Oldindan to'lov yo'q — mahsulotni olganingizda to'laysiz.</p>
                <div className="grid grid-cols-3 gap-2">
                  {PAY.map((p) => (
                    <label key={p.key} className={`cursor-pointer h-16 rounded-xl border-2 flex flex-col items-center justify-center gap-1 text-[13px] font-medium transition-colors ${pay === p.key ? 'border-[#10B981] bg-[#ECFDF5] text-[#047857]' : 'border-slate-200 text-slate-700 hover:border-slate-300'}`}>
                      <input type="radio" name="pay" value={p.key} checked={pay === p.key} onChange={() => setPay(p.key)} className="sr-only" />
                      <p.icon className="w-5 h-5" aria-hidden="true" />
                      {p.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            <footer className="shrink-0 border-t border-slate-200 px-4 sm:px-6 py-4 space-y-3" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
              {error && (
                <p role="alert" className="text-sm text-[#B91C1C] flex items-start gap-1.5 whitespace-pre-line">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
                </p>
              )}
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-slate-600 min-w-0">{delivery === 'delivery' ? "Yetkazish alohida" : 'Jami'}</span>
                <span className="font-display font-bold text-lg sm:text-xl text-[#111827] whitespace-nowrap">{fmt(total)}</span>
              </div>
              <button type="submit" disabled={processing} className="w-full h-12 rounded-xl bg-[#047857] text-white font-semibold hover:bg-[#065F46] disabled:opacity-60 transition-colors">
                {processing ? 'Yuborilmoqda…' : shopCount > 1 ? `${shopCount} ta do'konga buyurtma berish` : 'Buyurtma berish'}
              </button>
            </footer>
          </form>
        )}

        {step === 3 && (
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-10 text-center">
            <span className="w-16 h-16 mx-auto rounded-full bg-[#10B981] text-white flex items-center justify-center animate-scale-in">
              <Check className="w-9 h-9" strokeWidth={3} />
            </span>
            <h3 className="mt-5 font-display font-bold text-2xl text-[#111827]">Rahmat, {customer.trim().split(' ')[0]}!</h3>
            <p className="mt-2 text-slate-600">Do'kon buyurtmani tasdiqlab, +998 {prettyPhone(phone)} raqamiga qo'ng'iroq qiladi.</p>
            <ul className="mt-6 space-y-2 text-left">
              {results.map((r) => (
                <li key={r.orderId} className="rounded-2xl bg-[#F3F4F6] px-4 py-3 flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block font-semibold text-[#111827] truncate">{r.shopName}</span>
                    <span className="block text-xs text-slate-500">Buyurtma #{r.orderId}</span>
                  </span>
                  <span className="font-semibold text-[#111827] shrink-0">{fmt(r.total)}</span>
                </li>
              ))}
            </ul>
            <button type="button" onClick={onClose} className="mt-8 w-full h-12 rounded-xl bg-[#047857] text-white font-semibold">
              Xaridni davom ettirish
            </button>
          </div>
        )}
      </aside>
    </div>
  )
}
