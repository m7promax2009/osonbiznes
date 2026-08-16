import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Scissors,
  Star,
  MapPin,
  Phone,
  Search,
  Map as MapIcon,
  List,
  X,
  Check,
  Clock,
  ChevronRight,
  Calendar,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  MessageCircle,
} from 'lucide-react'
import api from '../services/api'
import ShopsMap from '../components/ShopsMap'
import Logo from '../components/Logo'
import AIAdvisor from '../components/AIAdvisor'
import { formatSom, nextDays } from '../utils/booking'
import { toast } from '../components/Toast'

export default function BarberMarket() {
  const [barbers, setBarbers] = useState([])
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [skill, setSkill] = useState('all')
  const [q, setQ] = useState('')
  const [view, setView] = useState('list') // 'list' | 'map'
  const [selected, setSelected] = useState(null) // barber being booked
  const [showAI, setShowAI] = useState(false)

  useEffect(() => {
    Promise.all([api.getBarbers(), api.getBarbershops()])
      .then(([b, s]) => {
        setBarbers(b || [])
        setShops(s || [])
      })
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  const skills = useMemo(() => {
    const set = new Set()
    barbers.forEach(b => (b.skills || []).forEach(s => set.add(s)))
    return ['all', ...Array.from(set)]
  }, [barbers])

  const filtered = barbers.filter(b => {
    const okSkill = skill === 'all' || (b.skills || []).includes(skill)
    const okQ = !q || b.name.toLowerCase().includes(q.toLowerCase()) || (b.salonName || '').toLowerCase().includes(q.toLowerCase())
    return okSkill && okQ
  })

  // Karta uchun filiallar (har filial — bitta marker)
  const mapPoints = useMemo(() => {
    const pts = []
    shops.forEach(s => (s.branches || []).forEach((br, i) => {
      if (br.latitude && br.longitude) {
        pts.push({
          _id: `${s.ownerId}-${i}`,
          name: `${s.name} — ${br.name}`,
          phone: br.phone || s.phone,
          address: br.address,
          latitude: br.latitude,
          longitude: br.longitude,
        })
      }
    }))
    return pts
  }, [shops])

  return (
    <div className="marketplace-page min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <p className="font-extrabold text-base leading-tight tracking-tight">Barbero</p>
              <p className="text-[10px] text-slate-400 font-semibold">Mahalla Sartaroshxona Navbati</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/navbatim"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-2 rounded-xl transition"
            >
              📋 Mening navbatim
            </Link>
            <Link
              to="/login"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-2"
            >
              Usta / Ega Kirish
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16 text-center relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-bold backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>Mahalladagi sartaroshlar — bir joyda</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Sartaroshingizni tanlang,<br />
            <span className="text-indigo-300">jonli navbatga yoziling</span>
          </h1>

          <p className="text-indigo-100 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
            30 daqiqa kutib o'tirish yo'q. Ustalarning tajribasi va reytingini solishtiring, bo'sh vaqtdan tanlab band qiling.
          </p>

          <div className="mt-6 max-w-md mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Sartarosh yoki salon nomi bo'yicha qidiruv..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white text-slate-900 placeholder:text-slate-400 shadow-xl shadow-indigo-950/30 outline-none focus:ring-4 focus:ring-indigo-400/30 text-sm font-medium"
            />
          </div>
        </div>
      </div>

      {/* Katalog */}
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Skill filter + view toggle */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
            {skills.map(s => (
              <button
                key={s}
                onClick={() => setSkill(s)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  skill === s
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {s === 'all' ? '✨ Barchasi' : s}
              </button>
            ))}
          </div>

          <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shrink-0 shadow-sm">
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded-lg transition ${view === 'list' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              title="Ro'yxat ko'rinishi"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('map')}
              className={`p-2 rounded-lg transition ${view === 'map' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              title="Xarita ko'rinishi"
            >
              <MapIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {view === 'map' ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-3 shadow-sm">
            <ShopsMap shops={mapPoints} height={480} />
            <p className="text-xs text-slate-400 text-center py-2 font-medium">
              📍 Xaritada filialni tanlab, to'g'ridan-to'g'ri navbat olishingiz mumkin
            </p>
          </div>
        ) : loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-44 skeleton rounded-3xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400 space-y-2">
            <Scissors className="w-12 h-12 mx-auto opacity-30 text-indigo-600" />
            <p className="text-sm font-semibold">Sartarosh topilmadi.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {filtered.map(b => (
              <div
                key={b._id}
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start gap-3.5">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-100 to-blue-100 flex items-center justify-center text-3xl shrink-0 shadow-inner">
                      {b.avatar || '💈'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-extrabold text-base text-slate-900 truncate">{b.name}</p>
                        <span className="flex items-center gap-0.5 text-xs font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-md">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {b.rating ? Number(b.rating).toFixed(1) : '5.0'}
                        </span>
                        <span className="text-[11px] text-slate-400">({b.reviewCount || 120})</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-600 truncate mt-0.5">{b.salonName}</p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-indigo-500" />
                        <span className="truncate">{b.branchName || 'Asosiy filial'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="flex flex-wrap gap-1.5 mt-3.5">
                    {(b.skills || ['Fade', 'Klassik', 'Soqol']).map(s => (
                      <span
                        key={s}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-5 pt-3.5 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Narxlar</p>
                    <p className="text-sm font-extrabold text-slate-900">
                      {formatSom(b.priceFrom || 40000)} <span className="text-xs font-normal text-slate-500">dan</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setSelected(b)}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center gap-1 shadow-md shadow-indigo-500/20 transition"
                  >
                    <span>Navbat band qilish</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suzuvchi AI Stilist Tugmasi */}
      <button
        onClick={() => setShowAI(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-extrabold text-sm shadow-xl shadow-indigo-500/30 hover:scale-105 transition"
      >
        <Sparkles className="w-5 h-5 text-amber-300 animate-spin" style={{ animationDuration: '4s' }} />
        <span>AI Stil Maslahatchi</span>
      </button>

      {showAI && (
        <AIAdvisor
          barbers={barbers}
          onClose={() => setShowAI(false)}
          onPick={(b) => setSelected(b)}
        />
      )}

      {/* Band qilish modali */}
      {selected && (
        <BookingModal
          barber={selected}
          onClose={() => setSelected(null)}
        />
      )}

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-400 space-y-1">
        <p className="font-bold text-slate-600">Barbero — Mahalladagi Sartaroshxonalar uchun Onlayn CRM & Navbat Tizimi ✂️</p>
        <p>Barcha huquqlar himoyalangan © 2026</p>
      </footer>
    </div>
  )
}

function BookingModal({ barber, onClose }) {
  const days = nextDays(3)
  const [salon, setSalon] = useState(null)
  const [service, setService] = useState(null)
  const [date, setDate] = useState(days[0].str)
  const [slots, setSlots] = useState([])
  const [slot, setSlot] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [payMethod, setPayMethod] = useState('click')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(null)
  const [loadingSlots, setLoadingSlots] = useState(false)

  useEffect(() => {
    api.getBarbershop(barber.ownerId).then(setSalon).catch(() => {})
  }, [barber])

  useEffect(() => {
    setLoadingSlots(true)
    setSlot('')
    api.getBarberSlots(barber._id, date)
      .then(d => setSlots(d.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false))
  }, [barber, date])

  const defaultServices = [
    { name: 'Fade (zamonaviy)', price: 60000 },
    { name: 'Klassik soch olish', price: 40000 },
    { name: 'Soqol olish', price: 25000 },
    { name: 'Soch + Soqol', price: 70000 },
    { name: 'Bolalar sochi', price: 30000 },
  ]

  const activeServices = (salon?.services && salon.services.length > 0) ? salon.services : defaultServices

  const book = async () => {
    if (!service) return toast.error('Xizmatni tanlang')
    if (!slot) return toast.error('Bo\'sh vaqtni tanlang')
    if (!name.trim() || !phone.trim()) return toast.error('Ismingiz va telefon raqamingizni kiriting')

    setSaving(true)
    try {
      const res = await api.createBooking({
        barberId: barber._id,
        service: service.name,
        servicePrice: service.price,
        date,
        timeSlot: slot,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        notes: notes.trim(),
        paymentMethod: payMethod,
      })
      setDone(res)
      toast.success('🎉 Navbat muvaffaqiyatli band qilindi!')
    } catch (e) {
      toast.error(e.message || 'Band qilishda xatolik yuz berdi')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {done ? (
          <div className="p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">Navbat band qilindi! 🎉</h3>
              <p className="text-xs text-slate-500 mt-1">Siz uchun vaqt ajratildi. Salonga 5 daqiqa oldin kelishingizni so'raymiz.</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Sartarosh:</span>
                <b className="text-slate-900">{done.barberName}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Xizmat:</span>
                <b className="text-slate-900">{done.service}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Vaqt:</span>
                <b className="text-slate-900">{done.date} soat {done.timeSlot}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Navbat raqami:</span>
                <b className="text-indigo-600 font-black text-sm">#{done.queueNumber}</b>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                <span className="text-slate-500 font-medium">15% Kafolat zalogi:</span>
                <b className="text-amber-600 font-black">{formatSom(done.deposit)}</b>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              💡 Zalog navbatingizni kafolatlaydi. "Mening navbatim" orqali jonli kuzatishingiz mumkin.
            </p>

            <div className="flex gap-2">
              <Link
                to="/navbatim"
                className="flex-1 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs text-center shadow-md shadow-indigo-500/25 transition"
              >
                Navbatimni kuzatish 📋
              </Link>
              <button
                onClick={onClose}
                className="px-5 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Yopish
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex items-center gap-3 z-10">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-2xl">
                {barber.avatar || '💈'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-slate-900 truncate">{barber.name}</p>
                <p className="text-xs text-slate-500 truncate">{barber.salonName} · {barber.branchName}</p>
              </div>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* 1. Xizmatni tanlash */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">1. Xizmatni tanlang</p>
                <div className="space-y-1.5">
                  {activeServices.map(s => (
                    <button
                      key={s.name}
                      onClick={() => setService(s)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition ${
                        service?.name === s.name
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-bold ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <span className="text-xs">{s.name}</span>
                      <span className="text-xs font-extrabold text-indigo-600">{formatSom(s.price)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Kun */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">2. Kunni tanlang</p>
                <div className="flex gap-2">
                  {days.map(d => (
                    <button
                      key={d.str}
                      onClick={() => setDate(d.str)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition ${
                        date === d.str
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Bo'sh vaqt slotlari */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">3. Bo'sh vaqtni tanlang</p>
                {loadingSlots ? (
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-9 skeleton rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto">
                    {slots.map(s => (
                      <button
                        key={s.time}
                        disabled={!s.available}
                        onClick={() => setSlot(s.time)}
                        className={`py-2 rounded-lg text-xs font-bold transition ${
                          slot === s.time
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : s.available
                            ? 'bg-slate-100 text-slate-800 hover:bg-indigo-100 hover:text-indigo-700'
                            : 'bg-slate-50 text-slate-300 line-through cursor-not-allowed'
                        }`}
                      >
                        {s.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Ism + telefon */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">4. Shaxsiy ma'lumotlar</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ismingiz"
                    className="px-3.5 py-2.5 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium"
                  />
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+998 90 123 45 67"
                    className="px-3.5 py-2.5 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium"
                  />
                </div>
              </div>

              {/* 5. To'lov usuli */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">5. To'lov usuli (15% zalog)</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayMethod('click')}
                    className={`p-3 rounded-xl border text-left text-xs font-bold transition ${
                      payMethod === 'click' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200'
                    }`}
                  >
                    💳 Click / Payme (Zalog)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod('cash')}
                    className={`p-3 rounded-xl border text-left text-xs font-bold transition ${
                      payMethod === 'cash' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200'
                    }`}
                  >
                    💵 Salonda to'layman
                  </button>
                </div>
              </div>

              <button
                onClick={book}
                disabled={saving}
                className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {saving ? 'Band qilinmoqda...' : <><Check className="w-5 h-5" /> Navbatni band qilish</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
