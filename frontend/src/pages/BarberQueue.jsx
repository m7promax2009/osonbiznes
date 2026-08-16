import React, { useState, useEffect } from 'react'
import {
  Scissors,
  Clock,
  Check,
  CheckCircle2,
  UserX,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  DollarSign,
  UserCheck,
  Phone,
  MessageSquare,
  Volume2,
} from 'lucide-react'
import api from '../services/api'
import { bkMeta, formatSom } from '../utils/booking'
import { SkeletonRows } from '../components/Skeleton'
import { toast } from '../components/Toast'

const CACHE_KEY = 'barber_queue_v2'

export default function BarberQueue({ user }) {
  const [bookings, setBookings] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(!navigator.onLine)
  const [delaying, setDelaying] = useState(false)

  useEffect(() => {
    load()
    const off = () => setOffline(true)
    const on = () => {
      setOffline(false)
      load()
    }
    window.addEventListener('offline', off)
    window.addEventListener('online', on)
    return () => {
      window.removeEventListener('offline', off)
      window.removeEventListener('online', on)
    }
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      const d = await api.getBookingsToday()
      setBookings(d.bookings || [])
      setStats(d.stats || {})
      localStorage.setItem(CACHE_KEY, JSON.stringify(d))
    } catch (e) {
      const c = localStorage.getItem(CACHE_KEY)
      if (c) {
        const d = JSON.parse(c)
        setBookings(d.bookings || [])
        setStats(d.stats || {})
        setOffline(true)
      } else {
        toast.error(e.message || 'Xatolik yuz berdi')
      }
    } finally {
      setLoading(false)
    }
  }

  const setStatus = async (id, status) => {
    try {
      await api.updateBookingStatus(id, status, 'cash')
      toast.success(`✅ ${bkMeta(status).label}`)
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  // Sartarosh 15 daqiqa kechikishi
  const handleDelay = async () => {
    setDelaying(true)
    try {
      await api.delayBarber(user?._id || user?.id, 15)
      toast.success('⏳ 15 daqiqa kechikish barcha keyingi mijozlarga e\'lon qilindi!')
      load()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setDelaying(false)
    }
  }

  // Hozirgi (arrived) va Keyingi (booked) mijozlar
  const arrivedBooking = bookings.find(b => b.status === 'arrived')
  const upcomingBookings = bookings.filter(b => b.status === 'booked')
  const nextBooking = upcomingBookings[0]
  const completedCount = bookings.filter(b => b.status === 'done').length
  const totalRevenue = bookings.filter(b => b.status === 'done').reduce((s, b) => s + (b.servicePrice || 0), 0)
  const masterShare = Math.round(totalRevenue * 0.6) // Usta 60% ulush oladi

  const todayFormatted = new Date().toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="space-y-6 animate-fade-in pb-16 max-w-2xl mx-auto">
      {/* Offline banner */}
      {offline && (
        <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>📴 Oflayn rejim — ma'lumotlar saqlanmoqda, internet yonganda yangilanadi.</span>
        </div>
      )}

      {/* Sarlavha & Usta kartasi */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl shadow-inner">
              {user?.avatar || '💈'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white">{user?.name || 'Jasur Usta'}</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 font-bold">
                  Faol Usta
                </span>
              </div>
              <p className="text-xs text-indigo-200 capitalize mt-0.5">
                {todayFormatted} · {user?.specialty || 'Fade ustasi'}
              </p>
            </div>
          </div>

          <button
            onClick={handleDelay}
            disabled={delaying}
            className="px-3.5 py-2.5 rounded-xl bg-amber-400 text-slate-900 font-extrabold text-xs flex items-center gap-1.5 shadow-md hover:bg-amber-300 transition"
            title="Keyingi mijozlarga 15 daqiqa kechikish haqida xabar yuborish"
          >
            <Clock className="w-4 h-4" />
            <span>+15 daq kechikish</span>
          </button>
        </div>

        {/* Usta tushumi va ko'rsatkichlari */}
        <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-white/10 text-center text-xs">
          <div className="p-2.5 rounded-xl bg-white/10">
            <p className="text-indigo-200">Xizmatlar</p>
            <p className="text-lg font-black text-white mt-0.5">{completedCount} ta</p>
          </div>
          <div className="p-2.5 rounded-xl bg-white/10">
            <p className="text-indigo-200">Jami tushum</p>
            <p className="text-lg font-black text-white mt-0.5">{formatSom(totalRevenue)}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30">
            <p className="text-emerald-300">Sizning ulushingiz (60%)</p>
            <p className="text-lg font-black text-emerald-300 mt-0.5">{formatSom(masterShare)}</p>
          </div>
        </div>
      </div>

      {/* 1. HOZIRGI STOLDA O'TIRGAN MIJOZ */}
      {arrivedBooking ? (
        <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500/80 rounded-3xl p-6 shadow-lg shadow-emerald-500/10 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span>Hozir stolda o'tirgan mijoz</span>
            </span>
            <span className="text-xs font-bold text-slate-400">⏰ {arrivedBooking.timeSlot}</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{arrivedBooking.customerName}</p>
              <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                {arrivedBooking.service} · {formatSom(arrivedBooking.servicePrice)}
              </p>
              <p className="text-xs text-slate-400 mt-1">📞 {arrivedBooking.customerPhone}</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center text-2xl">
              ✂️
            </div>
          </div>

          {arrivedBooking.notes && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              💡 <b>Mijoz istagi:</b> {arrivedBooking.notes}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setStatus(arrivedBooking._id, 'done')}
              className="flex-1 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition"
            >
              <CheckCircle2 className="w-6 h-6" /> Xizmat Bajarildi (Kassaga)
            </button>
          </div>
        </div>
      ) : null}

      {/* 2. KEYINGI KUTILAYOTGAN MIJOZ */}
      {nextBooking && !arrivedBooking && (
        <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500/60 rounded-3xl p-6 shadow-lg shadow-indigo-500/10 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Keyingi mijoz (Kutilmoqda)
            </span>
            <span className="text-xs font-bold text-slate-400">⏰ {nextBooking.timeSlot}</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{nextBooking.customerName}</p>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
                {nextBooking.service} · {formatSom(nextBooking.servicePrice)}
              </p>
              <p className="text-xs text-slate-400 mt-1">📞 {nextBooking.customerPhone}</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center text-2xl">
              💈
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setStatus(nextBooking._id, 'arrived')}
              className="flex-1 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition"
            >
              <Check className="w-6 h-6" /> Mijoz Keldi (Stolga o'tirdi)
            </button>
            <button
              onClick={() => setStatus(nextBooking._id, 'no_show')}
              className="px-5 py-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 font-extrabold text-sm flex items-center gap-1.5 hover:bg-rose-100 transition"
              title="Mijoz kelmadi — zalog saqlanadi"
            >
              <UserX className="w-5 h-5" /> Kelmadi
            </button>
          </div>
        </div>
      )}

      {/* 3. BUGUNGI BARCHA NAVBATLAR RO'YXATI */}
      <div className="space-y-3">
        <h2 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center justify-between">
          <span>Bugungi barcha navbatlaringiz</span>
          <span className="text-xs text-slate-400 font-semibold">{bookings.length} ta jami</span>
        </h2>

        {loading ? (
          <SkeletonRows rows={4} />
        ) : bookings.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 opacity-40" />
            <p className="text-sm font-bold">Bugun boshqa navbat yo'q 🎉</p>
            <p className="text-xs text-slate-400">Yaxshi dam oling yoki yangi mijoz qabul qiling.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {bookings.map(b => {
              const m = bkMeta(b.status)
              const isDim = ['done', 'no_show', 'cancelled'].includes(b.status)
              return (
                <div
                  key={b._id}
                  className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3 ${
                    isDim ? 'opacity-60 bg-slate-50/50 dark:bg-slate-900/40' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-center shrink-0 w-12 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                      <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{b.timeSlot}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                        {b.customerName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {b.service} · {formatSom(b.servicePrice)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`badge border text-xs px-2.5 py-1 ${m.pill}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                      {m.label}
                    </span>

                    {b.status === 'booked' && (
                      <button
                        onClick={() => setStatus(b._id, 'arrived')}
                        className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                        title="Keldi"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
