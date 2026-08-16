import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Clock,
  Users,
  Phone,
  CheckCircle2,
  Calendar,
  ArrowLeft,
  Scissors,
  Bell,
  MapPin,
  RefreshCw,
  AlertCircle,
  XCircle,
  ShieldCheck,
  Send,
} from 'lucide-react'
import api from '../services/api'
import Logo from '../components/Logo'
import { bkMeta, formatSom } from '../utils/booking'
import { toast } from '../components/Toast'

export default function MyQueue() {
  const [phone, setPhone] = useState(() => localStorage.getItem('tracked_phone') || '')
  const [items, setItems] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    if (phone) {
      search()
    }
  }, [])

  // 15 soniyada bir avtomatik yangilanish
  useEffect(() => {
    if (!autoRefresh || !phone || !items || items.length === 0) return
    const interval = setInterval(() => {
      search(false)
    }, 15000)
    return () => clearInterval(interval)
  }, [autoRefresh, phone, items])

  const search = async (showLoading = true) => {
    if (!phone.trim()) {
      setError('Telefon raqamini kiriting')
      return
    }
    setError('')
    if (showLoading) setLoading(true)
    try {
      localStorage.setItem('tracked_phone', phone.trim())
      const data = await api.trackBookings(phone.trim())
      setItems(data || [])
    } catch (err) {
      setError(err.message || 'Navbatni topishda xatolik')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  // Mijoz kechikishi haqida xabar berish
  const handleClientDelay = async (bookingId) => {
    toast.success('⏳ 10 daqiqa kechikishingiz haqida ustaga xabar berildi.')
  }

  // Navbatni bekor qilish
  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Rostdan ham navbatingizni bekor qilmoqchimisiz?')) return
    try {
      await api.updateBookingStatus(bookingId, 'cancelled')
      toast.success('Navbat bekor qilindi va vaqt bo\'shatildi.')
      search()
    } catch (e) {
      toast.error(e.message || 'Xatolik yuz berdi')
    }
  }

  return (
    <div className="marketplace-page min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/salon" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm">
              <Scissors className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-slate-900 text-sm">Barbero Navbat</span>
          </Link>
          <Link
            to="/salon"
            className="text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-xl transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Sartaroshlar</span>
          </Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Sarlavha */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/25">
            <Bell className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Jonli Navbatni Kuzatish</h1>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Telefon raqamingizni kiriting va navbatingizgacha necha kishi qolganini real vaqtda ko'ring.
          </p>
        </div>

        {/* Qidiruv formasi */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            search()
          }}
          className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 space-y-3"
        >
          <label className="block text-xs font-bold uppercase text-slate-500 tracking-wide">
            Telefon raqamingiz
          </label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              inputMode="tel"
              placeholder="+998 90 123 45 67"
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-base font-bold text-slate-900"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Qidirilmoqda...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Navbatimni topish</span>
              </>
            )}
          </button>
        </form>

        {/* Natijalar ro'yxati */}
        {items && items.length === 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-3">
            <Calendar className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">Bu raqamda hozircha faol navbat topilmadi.</p>
            <p className="text-xs text-slate-400">Navbatga yozilish uchun sartarosh tanlang.</p>
            <Link
              to="/salon"
              className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-extrabold shadow-md shadow-indigo-500/20"
            >
              Yangi navbat olish ✂️
            </Link>
          </div>
        )}

        {items && items.map(b => {
          const m = bkMeta(b.status)
          const isCurrentTurn = b.peopleAhead === 0 && b.status === 'booked'

          return (
            <div
              key={b.id || b._id}
              className="bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden animate-fade-in space-y-4 p-5"
            >
              {/* Usta va Filial */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-100 to-blue-100 flex items-center justify-center text-2xl shadow-inner">
                    💈
                  </div>
                  <div>
                    <p className="text-base font-black text-slate-900">{b.barberName}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-indigo-500" />
                      <span>{b.branchName || 'Asosiy filial'}</span>
                    </p>
                  </div>
                </div>

                <span className={`badge border text-xs px-2.5 py-1 ${m.pill}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                  {m.label}
                </span>
              </div>

              {/* Statusga ko'ra ko'rsatkichlar */}
              {b.status === 'arrived' ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold text-center flex items-center justify-center gap-2">
                  <Scissors className="w-4 h-4 text-emerald-600 animate-pulse" />
                  <span>Siz salondasiz — hozir sizga xizmat ko'rsatilmoqda!</span>
                </div>
              ) : isCurrentTurn ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold text-center flex items-center justify-center gap-2">
                  <Bell className="w-4 h-4 text-amber-600 animate-bounce" />
                  <span>Sizning navbatingiz yetib keldi! Iltimos, stolga o'ting.</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {/* Tartib raqami */}
                  <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-100 text-center">
                    <p className="text-4xl font-black text-indigo-600 leading-none">#{b.queueNumber}</p>
                    <p className="text-[11px] text-slate-500 mt-1 font-bold">navbat raqamingiz</p>
                  </div>

                  {/* Oldidagi odamlar */}
                  <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-100 text-center">
                    <p className="text-4xl font-black text-amber-600 leading-none flex items-center justify-center gap-1">
                      <Users className="w-6 h-6" />
                      <span>{b.peopleAhead}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 font-bold">oldingizda kishi</p>
                  </div>
                </div>
              )}

              {/* Kutish vaqti */}
              {b.status === 'booked' && (
                <div className="flex items-center justify-center gap-2 text-xs text-indigo-800 bg-indigo-50/90 rounded-2xl py-3 font-bold border border-indigo-100">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>Taxminiy kutish vaqti: ~{b.estimatedWaitMin || 15} daqiqa</span>
                </div>
              )}

              {/* Xizmat va to'lov tafsiloti */}
              <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-3">
                <span className="text-slate-500 flex items-center gap-1 font-medium">
                  <Calendar className="w-3.5 h-3.5" /> {b.date} · {b.timeSlot}
                </span>
                <span className="font-extrabold text-slate-900">
                  {b.service} · {formatSom(b.servicePrice)}
                </span>
              </div>

              {/* Zalog info */}
              <div className="flex items-center justify-between text-[11px] bg-slate-50 rounded-xl p-2.5">
                <span className="text-slate-500 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>15% Kafolat zalogi: <b>{formatSom(b.deposit)}</b></span>
                </span>
                <span className={`font-bold ${b.depositPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {b.depositPaid ? '✅ To\'langan' : '⚠️ Salonda to\'lanadi'}
                </span>
              </div>

              {/* Mijoz amallari */}
              {b.status === 'booked' && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleClientDelay(b.id || b._id)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                  >
                    ⏳ 10 daqiqa kechikaman
                  </button>
                  <button
                    onClick={() => handleCancelBooking(b.id || b._id)}
                    className="px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition"
                  >
                    Bekor qilish
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* Telegram bot orqali bildirishnomalar */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-3xl p-5 shadow-md flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 text-white">
            <Send className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-sm leading-tight">Telegram Bot orqali bildirishnoma</p>
            <p className="text-xs text-blue-100 mt-0.5">Navbatingiz yetib kelganda bot orqali xabar olasiz.</p>
          </div>
          <a
            href="https://t.me/OsonBiznesUzBot"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 rounded-xl bg-white text-indigo-950 font-extrabold text-xs shrink-0 shadow-sm hover:bg-blue-50 transition"
          >
            Botga o'tish
          </a>
        </div>
      </div>
    </div>
  )
}
