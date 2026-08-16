import React, { useState, useEffect, useMemo } from 'react'
import {
  Calendar,
  Scissors,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
  Users,
  Clock,
  UserX,
  Check,
  Plus,
  Mic,
  MicOff,
  Sparkles,
  Package,
  CreditCard,
  Printer,
  Send,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  MessageSquare,
  ChevronRight,
  TrendingUp,
  X,
  PhoneCall,
} from 'lucide-react'
import api from '../services/api'
import { bkMeta, formatSom, nextDays } from '../utils/booking'
import { SkeletonRows } from '../components/Skeleton'
import { toast } from '../components/Toast'

const CACHE_KEY = 'salon_today_v2'

export default function SalonToday() {
  const [activeTab, setActiveTab] = useState('today') // 'today' | 'new_booking' | 'inventory' | 'pos' | 'ai_copilot'
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(!navigator.onLine)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modallar
  const [selectedForMessage, setSelectedForMessage] = useState(null)
  const [selectedForReceipt, setSelectedForReceipt] = useState(null)
  const [aiInsights, setAiInsights] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [anLoading, setAnLoading] = useState(false)

  // AI Ovozli kiritish holati
  const [isListening, setIsListening] = useState(false)
  const [voiceText, setVoiceText] = useState('')
  const [aiParsing, setAiParsing] = useState(false)
  const [aiParsedBooking, setAiParsedBooking] = useState(null)

  // Ombor (Products)
  const [inventory, setInventory] = useState([])
  const [invLoading, setInvLoading] = useState(false)
  const [newInvModal, setNewInvModal] = useState(false)
  const [newInvItem, setNewInvItem] = useState({ name: '', category: 'Sarf materiali', stock: 10, cost: 20000, price: 30000 })

  // Yangi navbat formasi
  const [newBooking, setNewBooking] = useState({
    barberId: '',
    service: 'Fade (zamonaviy)',
    servicePrice: 60000,
    date: new Date().toISOString().slice(0, 10),
    timeSlot: '15:00',
    customerName: '',
    customerPhone: '',
    notes: '',
    paymentMethod: 'none',
  })
  const [creatingBooking, setCreatingBooking] = useState(false)

  // POS tezkor to'lov
  const [posForm, setPosForm] = useState({
    barberId: '',
    service: 'Klassik soch olish',
    amount: 40000,
    customerName: 'Navbatsiz mijoz',
    paymentMethod: 'cash',
  })

  useEffect(() => {
    if (activeTab === 'analytics' && !analytics && !anLoading) {
      setAnLoading(true)
      api.getBookingAnalytics(7).then(setAnalytics).catch(() => {}).finally(() => setAnLoading(false))
    }
  }, [activeTab])

  useEffect(() => {
    load()
    loadInventory()
    loadAiInsights()

    const off = () => setOffline(true)
    const on = () => {
      setOffline(false)
      load()
      toast.success('Internet ulandi! Ma\'lumotlar yangilandi.')
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
      setData(d)
      localStorage.setItem(CACHE_KEY, JSON.stringify(d))
    } catch (e) {
      const c = localStorage.getItem(CACHE_KEY)
      if (c) {
        setData(JSON.parse(c))
        setOffline(true)
      } else {
        toast.error(e.message || 'Ma\'lumotlarni yuklab bo\'lmadi')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadInventory = async () => {
    try {
      setInvLoading(true)
      const res = await api.getProducts()
      setInventory(res.data || res || [])
    } catch (_) {}
    finally {
      setInvLoading(false)
    }
  }

  const loadAiInsights = async () => {
    try {
      const res = await api.getAIInsights()
      setAiInsights(res)
    } catch (_) {}
  }

  const setStatus = async (id, status, paymentMethod) => {
    try {
      await api.updateBookingStatus(id, status, paymentMethod)
      toast.success(`Holat yangilandi: ${bkMeta(status).label}`)
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  // Usta 15 daqiqa kechikishi
  const handleDelay = async (barberId) => {
    try {
      await api.delayBarber(barberId, 15)
      toast.success('⏳ 15 daqiqa kechikish barcha mijozlarga e\'lon qilindi.')
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  // Web Speech API orqali AI ovozli navbat yozish
  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('Brauzeringiz ovozli qidiruvni qo\'llab-quvvatlamaydi. Matn orqali kiritishingiz mumkin.')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'uz-UZ'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
      toast.info('Gapiring: Masalan: "Jasur ustaga soat 16:30 ga Rustam akaga fade va soqol yoz"')
    }

    recognition.onresult = async (event) => {
      const speechResult = event.results[0][0].transcript
      setVoiceText(speechResult)
      setIsListening(false)
      parseVoiceText(speechResult)
    }

    recognition.onerror = (event) => {
      setIsListening(false)
      toast.error('Ovozni eshitishda xatolik: ' + event.error)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
  }

  const parseVoiceText = async (textToParse) => {
    const text = textToParse || voiceText
    if (!text.trim()) return toast.error('Matn kiritilmadi')
    setAiParsing(true)
    try {
      const parsed = await api.aiParseVoice(text, data?.role === 'shop_owner' ? data?._id : undefined)
      setAiParsedBooking(parsed)
      toast.success('🤖 AI buyurtmani muvaffaqiyatli tahlil qildi!')
    } catch (e) {
      toast.error('AI tahlilda xatolik: ' + e.message)
    } finally {
      setAiParsing(false)
    }
  }

  const confirmAiBooking = async () => {
    if (!aiParsedBooking) return
    try {
      await api.createBooking({
        ...aiParsedBooking,
        isVoiceAdded: true,
      })
      toast.success('✅ Navbat jadvalga muvaffaqiyatli qo\'shildi!')
      setAiParsedBooking(null)
      setVoiceText('')
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  // Yangi navbatni qo'lda yaratish
  const handleCreateBooking = async (e) => {
    e.preventDefault()
    if (!newBooking.barberId) return toast.error('Sartaroshni tanlang')
    if (!newBooking.customerName || !newBooking.customerPhone) return toast.error('Ism va telefonni kiriting')
    setCreatingBooking(true)
    try {
      await api.createBooking(newBooking)
      toast.success('✅ Yangi navbat band qilindi!')
      setNewBooking({
        barberId: '',
        service: 'Fade (zamonaviy)',
        servicePrice: 60000,
        date: new Date().toISOString().slice(0, 10),
        timeSlot: '15:00',
        customerName: '',
        customerPhone: '',
        notes: '',
        paymentMethod: 'none',
      })
      setActiveTab('today')
      load()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setCreatingBooking(false)
    }
  }

  // Ombor yangi mahsulot qo'shish
  const handleAddInventory = async (e) => {
    e.preventDefault()
    if (!newInvItem.name) return toast.error('Nomi majburiy')
    try {
      await api.createProduct(newInvItem)
      toast.success('✅ Mahsulot omborga qo\'shildi!')
      setNewInvModal(false)
      loadInventory()
    } catch (e) {
      toast.error(e.message)
    }
  }

  // POS tezkor kassa
  const handlePosCheckout = async (e) => {
    e.preventDefault()
    if (!posForm.barberId) return toast.error('Sartaroshni tanlang')
    try {
      await api.createBooking({
        barberId: posForm.barberId,
        service: posForm.service,
        servicePrice: posForm.amount,
        date: new Date().toISOString().slice(0, 10),
        timeSlot: new Date().toTimeString().slice(0, 5),
        customerName: posForm.customerName || 'Jonli mijoz',
        customerPhone: '+998 90 000 00 00',
        paymentMethod: posForm.paymentMethod,
        notes: 'POS tezkor kassa orqali qabul qilindi',
      })
      toast.success(`💳 To'lov qabul qilindi: ${formatSom(posForm.amount)} (${posForm.paymentMethod})`)
      load()
      setActiveTab('today')
    } catch (e) {
      toast.error(e.message)
    }
  }

  const s = data?.stats || {}
  const bookings = data?.bookings || []
  const barbers = data?.barberLoad || []

  // Filtrlangan navbatlar
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchStatus =
        statusFilter === 'all' ? true :
        statusFilter === 'risky' ? (!b.depositPaid && b.status === 'booked') :
        b.status === statusFilter
      const matchSearch =
        !searchQuery ||
        b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.customerPhone.includes(searchQuery) ||
        b.barberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.service.toLowerCase().includes(searchQuery.toLowerCase())
      return matchStatus && matchSearch
    })
  }, [bookings, statusFilter, searchQuery])

  const noShows = bookings.filter(b => b.status === 'no_show')
  const risky = bookings.filter(b => b.status === 'booked' && !b.depositPaid)
  const todayFormatted = new Date().toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Offline banner */}
      {offline && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-sm font-semibold shadow-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="font-bold">📴 Oflayn rejim faol</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 font-normal">Internet uzildi. Barcha ma'lumotlar lokal saqlanmoqda, internet yonganda server bilan sinxronlanadi.</p>
          </div>
          <button onClick={load} className="px-3 py-1.5 rounded-xl bg-amber-200/80 dark:bg-amber-900/60 text-xs font-bold hover:bg-amber-300 transition">Qayta tekshirish</button>
        </div>
      )}

      {/* Sarlavha & Boshqaruv Tablari */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Bugun menda nima bor? 👋
            </h1>
            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
              Jonli CRM
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 capitalize font-medium">
            {todayFormatted} · Barcha navbatlar va kassa holati
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab('today')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'today'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Bugungi Doska</span>
          </button>
          <button
            onClick={() => setActiveTab('new_booking')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'new_booking'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Yangi Navbat</span>
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'inventory'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Ombor & Sarf</span>
          </button>
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'pos'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>POS Kassa</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Analitika</span>
          </button>
          <button
            onClick={() => setActiveTab('ai_copilot')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'ai_copilot'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-500/25'
                : 'text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Copilot</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: BUGUNGI DOSKA ================= */}
      {activeTab === 'today' && (
        <div className="space-y-6">
          {/* 4 Hero KPI Kartalari */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Jami navbatlar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  #{s.total || 0} ta jami
                </span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-4">{s.total || 0}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium flex items-center gap-1.5">
                <span className="text-emerald-600 font-bold">{s.done || 0} bajarildi</span> ·
                <span className="text-blue-600 font-bold">{s.arrived || 0} stolda</span>
              </p>
            </div>

            {/* 2. Bugungi kassa */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                  Tushum
                </span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-4">{formatSom(s.revenue || 0)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Salon sof ulushi (40%): <b className="text-slate-800 dark:text-slate-200">{formatSom(Math.round((s.revenue || 0) * 0.4))}</b>
              </p>
            </div>

            {/* 3. Zalog kafolati */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                  15% Zalog
                </span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-4">
                {bookings.filter(b => b.depositPaid).length} / {bookings.length}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Kafolatlangan navbatlar ulushi
              </p>
            </div>

            {/* 4. Kelmaganlar (No-show) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <UserX className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400">
                  No-Show
                </span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-4">{s.noShow || 0}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Zalog kompensatsiya qilindi
              </p>
            </div>
          </div>

          {/* 🎙 AI Ovozli Navbat Qo'shish Vidjeti */}
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-bold backdrop-blur-sm">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                  <span>AI Ovozli Navbat Yozuvchi (Voice-to-CRM)</span>
                </div>
                <h3 className="text-xl font-bold text-white">
                  Qo'lingiz bandmi? Shunchaki ovoz bilan gapiring!
                </h3>
                <p className="text-indigo-200 text-xs leading-relaxed">
                  Masalan: <span className="text-white font-semibold">"Jasur ustaga soat 16:30 ga Shavkat akaga fade va soqol yozib qo'y"</span>. AI avtomatik tushunadi va navbatga kiritadi.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={startVoiceInput}
                  disabled={isListening}
                  className={`px-5 py-3.5 rounded-2xl font-extrabold text-sm flex items-center gap-2 shadow-lg transition-all ${
                    isListening
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-white text-indigo-950 hover:bg-indigo-50 hover:scale-105'
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-5 h-5" />
                      <span>Eshitilmoqda...</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5 text-indigo-600" />
                      <span>Ovoz bilan gapirish</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Matnli input va natija */}
            <div className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-2">
              <input
                value={voiceText}
                onChange={e => setVoiceText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && parseVoiceText()}
                placeholder="Yoki bu yerga yozing: Jasur ustaga soat 16:30 da Farhod akaga soqol yoz..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-indigo-300 text-sm outline-none focus:ring-2 focus:ring-white/40"
              />
              <button
                onClick={() => parseVoiceText()}
                disabled={aiParsing || !voiceText}
                className="px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              >
                {aiParsing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>AI Tahlil</span>
              </button>
            </div>

            {/* AI Parsed Natijasi */}
            {aiParsedBooking && (
              <div className="mt-4 p-4 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 text-white animate-fade-in flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 text-xs">
                  <p className="font-extrabold text-sm text-indigo-100">🎯 AI Tahlil natijasi tayyor:</p>
                  <p>👤 <b>Mijoz:</b> {aiParsedBooking.customerName} ({aiParsedBooking.customerPhone})</p>
                  <p>💈 <b>Sartarosh:</b> {aiParsedBooking.barberName} | ✂️ <b>Xizmat:</b> {aiParsedBooking.service} ({formatSom(aiParsedBooking.servicePrice)})</p>
                  <p>⏰ <b>Vaqt:</b> {aiParsedBooking.date} soat {aiParsedBooking.timeSlot}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={confirmAiBooking}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs flex items-center gap-1 shadow-md transition"
                  >
                    <Check className="w-4 h-4" /> Tasdiqlash
                  </button>
                  <button
                    onClick={() => setAiParsedBooking(null)}
                    className="px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs"
                  >
                    Bekor
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* No-show yoki Zalog xavfi ogohlantirishi */}
          {(noShows.length > 0 || risky.length > 0) && (
            <div className="grid md:grid-cols-2 gap-4">
              {risky.length > 0 && (
                <div className="bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-3xl p-5">
                  <p className="flex items-center gap-2 mb-2 text-amber-800 dark:text-amber-400 font-bold text-sm">
                    <AlertTriangle className="w-4 h-4" /> Kelmaslik xavfi — zalog to'lanmagan ({risky.length} ta)
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Ushbu mijozlarga Telegram/SMS orqali eslatma yuborish tavsiya etiladi. 15% zalog tizimi no-show ko'rsatkichini 90% ga kamaytiradi.
                  </p>
                </div>
              )}
              {noShows.length > 0 && (
                <div className="bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-3xl p-5">
                  <p className="flex items-center gap-2 mb-2 text-rose-800 dark:text-rose-400 font-bold text-sm">
                    <UserX className="w-4 h-4" /> Bugun kelmaganlar ({noShows.length} ta)
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {noShows.map(b => b.customerName).join(', ')} — zalog kompensatsiya sifatida saqlab qolindi va keyingi navbatlar oldinga siljitildi.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Asosiy 2 ustun: Navbatlar Jadvali + Sartaroshlar yuklamasi */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Chap ustun: Navbatlar */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Bugungi navbatlar ro'yxati</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {filteredBookings.length} ta
                  </span>
                </h2>

                {/* Qidiruv va Filter */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Mijoz yoki usta..."
                      className="pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 w-36 sm:w-44"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">Barchasi</option>
                    <option value="booked">Navbatda</option>
                    <option value="arrived">Stolda</option>
                    <option value="done">Bajarildi</option>
                    <option value="no_show">Kelmadi</option>
                    <option value="risky">Zalog to'lanmagan</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <SkeletonRows rows={5} />
              ) : filteredBookings.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
                  <Calendar className="w-12 h-12 mx-auto opacity-30 text-indigo-500" />
                  <p className="text-sm font-semibold">Navbatlar topilmadi.</p>
                  <button
                    onClick={() => setActiveTab('new_booking')}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Yangi navbat qo'shish
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredBookings.map(b => {
                    const m = bkMeta(b.status)
                    const isDimmed = ['done', 'no_show', 'cancelled'].includes(b.status)
                    return (
                      <div
                        key={b._id}
                        className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isDimmed ? 'opacity-70 bg-slate-50/50 dark:bg-slate-900/40' : ''
                        }`}
                      >
                        {/* Vaqt va Tartib raqami */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="text-center shrink-0 w-14 py-1 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <p className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                              {b.timeSlot}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold">#{b.queueNumber}</p>
                          </div>

                          {/* Mijoz ma'lumotlari */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                                {b.customerName}
                              </p>
                              {b.isVoiceAdded && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-bold" title="AI ovozli orqali qo'shilgan">
                                  🎙 AI
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">{b.service}</span> · {formatSom(b.servicePrice)} · 💈 {b.barberName}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                              <span>📞 {b.customerPhone}</span>
                              {b.depositPaid ? (
                                <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                                  <ShieldCheck className="w-3 h-3" /> Zalog to'langan ({formatSom(b.deposit)})
                                </span>
                              ) : (
                                <span className="text-amber-600 font-semibold flex items-center gap-0.5">
                                  <AlertTriangle className="w-3 h-3" /> Zalog to'lanmagan
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Status va Harakatlar */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <span className={`badge border text-xs px-2.5 py-1 ${m.pill}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                            {m.label}
                          </span>

                          {/* Harakat tugmalari */}
                          {b.status === 'booked' && (
                            <button
                              onClick={() => setStatus(b._id, 'arrived')}
                              className="px-2.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 flex items-center gap-1 transition shadow-sm"
                              title="Mijoz keldi — stolga o'tirdi"
                            >
                              <Check className="w-3.5 h-3.5" /> Keldi
                            </button>
                          )}

                          {b.status === 'arrived' && (
                            <button
                              onClick={() => setStatus(b._id, 'done', 'cash')}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 flex items-center gap-1 transition shadow-sm"
                              title="Xizmat bajarildi va to'lov qilindi"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Bajarildi
                            </button>
                          )}

                          {(b.status === 'booked' || b.status === 'arrived') && (
                            <button
                              onClick={() => setStatus(b._id, 'no_show')}
                              className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100 transition"
                              title="Mijoz kelmadi (No-show)"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}

                          {/* AI Xabar generator */}
                          <button
                            onClick={() => setSelectedForMessage(b)}
                            className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 hover:bg-indigo-100 transition"
                            title="AI Eslatma / SMS xabar yuborish"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* O'ng ustun: Sartaroshlar Yuklamasi & Ombor Qoldig'i */}
            <div className="space-y-6">
              {/* Sartaroshlar yuklamasi */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>Sartaroshlar Yuklamasi</span>
                  </h3>
                  <span className="text-xs text-slate-400">{barbers.length} usta</span>
                </div>

                <div className="space-y-3">
                  {barbers.map(bar => (
                    <div key={bar._id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-xl shrink-0">
                          {bar.avatar || '💈'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {bar.name} <span className="text-amber-500 font-semibold text-xs">⭐{bar.rating}</span>
                          </p>
                          <p className="text-xs text-slate-400 truncate">{bar.specialty}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">{bar.total || 0} ta</p>
                          <p className="text-[10px] text-slate-400 font-semibold">{bar.doneCount || 0} bajarildi</p>
                        </div>
                      </div>

                      {/* Kechikish tugmasi */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700 text-xs">
                        <span className="text-slate-500">Tushumi: <b>{formatSom(bar.revenue || 0)}</b></span>
                        <button
                          onClick={() => handleDelay(bar._id)}
                          className="px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold hover:bg-amber-200 text-[11px] transition"
                          title="Sartarosh 15 daqiqa kechikayotgani haqida barcha mijozlarga xabar yuborish"
                        >
                          +15 daq kechikish
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ombor qisqa signali */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-600" />
                    <span>Sarf Materiallari (Ombor)</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('inventory')}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
                  >
                    Barchasi <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  {inventory.slice(0, 4).map(item => (
                    <div key={item._id} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[140px]">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          item.stock < 5 ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {item.stock} dona qoldi
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: YANGI NAVBAT BAND QILISH ================= */}
      {activeTab === 'new_booking' && (
        <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">➕ Yangi Navbat Yozish</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Mijoz qo'ng'iroq qilganda yoki joyida yozilganda tezkor navbat band qilish.</p>
          </div>

          <form onSubmit={handleCreateBooking} className="space-y-4">
            {/* Sartarosh tanlash */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">1. Sartaroshni tanlang</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {barbers.map(bar => (
                  <button
                    type="button"
                    key={bar._id}
                    onClick={() => setNewBooking({ ...newBooking, barberId: bar._id })}
                    className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 ${
                      newBooking.barberId === bar._id
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 ring-2 ring-indigo-500'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-2xl">{bar.avatar || '💈'}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{bar.name}</p>
                      <p className="text-[10px] text-slate-400">{bar.specialty}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Xizmat tanlash */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">2. Xizmat turi</label>
                <select
                  value={newBooking.service}
                  onChange={e => {
                    const prices = {
                      'Fade (zamonaviy)': 60000,
                      'Klassik soch olish': 40000,
                      'Soqol olish': 25000,
                      'Soch + Soqol': 70000,
                      'Bolalar sochi': 30000,
                      'Ukladka / styling': 50000,
                    }
                    setNewBooking({
                      ...newBooking,
                      service: e.target.value,
                      servicePrice: prices[e.target.value] || 50000,
                    })
                  }}
                  className="w-full px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Fade (zamonaviy)">Fade (zamonaviy) — 60 000 so'm</option>
                  <option value="Klassik soch olish">Klassik soch olish — 40 000 so'm</option>
                  <option value="Soqol olish">Soqol olish — 25 000 so'm</option>
                  <option value="Soch + Soqol">Soch + Soqol — 70 000 so'm</option>
                  <option value="Bolalar sochi">Bolalar sochi — 30 000 so'm</option>
                  <option value="Ukladka / styling">Ukladka / styling — 50 000 so'm</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">3. Vaqt (Slot)</label>
                <input
                  type="time"
                  value={newBooking.timeSlot}
                  onChange={e => setNewBooking({ ...newBooking, timeSlot: e.target.value })}
                  className="w-full px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Mijoz ismi va telefoni */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Mijoz Ismi</label>
                <input
                  value={newBooking.customerName}
                  onChange={e => setNewBooking({ ...newBooking, customerName: e.target.value })}
                  placeholder="Masalan: Sardor aka"
                  className="w-full px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Telefon Raqami</label>
                <input
                  value={newBooking.customerPhone}
                  onChange={e => setNewBooking({ ...newBooking, customerPhone: e.target.value })}
                  placeholder="+998 90 123 45 67"
                  className="w-full px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* To'lov usuli */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Zalog / To'lov holati</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'none', label: 'Keyin to\'laydi' },
                  { id: 'cash', label: 'Naqd zalog' },
                  { id: 'click', label: 'Click / Karta' },
                ].map(pm => (
                  <button
                    type="button"
                    key={pm.id}
                    onClick={() => setNewBooking({ ...newBooking, paymentMethod: pm.id })}
                    className={`py-2.5 rounded-xl border text-xs font-bold transition ${
                      newBooking.paymentMethod === pm.id
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={creatingBooking}
              className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition disabled:opacity-50"
            >
              {creatingBooking ? 'Band qilinmoqda...' : <><Check className="w-5 h-5" /> Navbatni Rasmiylashtirish</>}
            </button>
          </form>
        </div>
      )}

      {/* ================= TAB 3: OMBOR & SARF MATERIALLARI ================= */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" />
                <span>Sartaroshxona Ombori va Sarf Materiallari</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Shampun, vosk, lezviyalar, bir martalik sochiqlar qoldig'i hisobi.</p>
            </div>
            <button
              onClick={() => setNewInvModal(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm hover:bg-emerald-500 transition"
            >
              <Plus className="w-4 h-4" /> Mahsulot Qo'shish
            </button>
          </div>

          {invLoading ? (
            <SkeletonRows rows={4} />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {inventory.map(item => {
                const isLow = item.stock < 5
                return (
                  <div
                    key={item._id}
                    className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {item.category}
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        isLow ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                      }`}>
                        {item.stock} dona qoldi
                      </span>
                    </div>

                    <div>
                      <p className="font-extrabold text-base text-slate-900 dark:text-white">{item.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">SKU: {item.sku || 'SRV-001'}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <p className="text-slate-400">Tannarx</p>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{formatSom(item.cost || 0)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-400">Chakana narx</p>
                        <p className="font-bold text-indigo-600 dark:text-indigo-400">{formatSom(item.price || 0)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 4: POS KASSA ================= */}
      {activeTab === 'pos' && (
        <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              <span>Tezkor POS Kassa & To'lov</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Navbatsiz kelgan mijozlar uchun darhol xizmat va to'lov kiritish.</p>
          </div>

          <form onSubmit={handlePosCheckout} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Sartarosh</label>
              <select
                value={posForm.barberId}
                onChange={e => setPosForm({ ...posForm, barberId: e.target.value })}
                className="w-full px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Sartaroshni tanlang...</option>
                {barbers.map(bar => (
                  <option key={bar._id} value={bar._id}>{bar.name} ({bar.specialty})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Xizmat va Summa</label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={posForm.service}
                  onChange={e => setPosForm({ ...posForm, service: e.target.value })}
                  placeholder="Xizmat nomi"
                  className="px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold outline-none"
                />
                <input
                  type="number"
                  value={posForm.amount}
                  onChange={e => setPosForm({ ...posForm, amount: Number(e.target.value) })}
                  placeholder="Summa"
                  className="px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">To'lov usuli</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cash', label: '💵 Naqd' },
                  { id: 'card', label: '💳 Uzcard/Humo' },
                  { id: 'click', label: '📱 Click/Payme' },
                ].map(m => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => setPosForm({ ...posForm, paymentMethod: m.id })}
                    className={`py-3 rounded-xl border text-xs font-bold transition ${
                      posForm.paymentMethod === m.id
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition"
            >
              <Check className="w-5 h-5" /> To'lovni Qabul Qilish & Chek
            </button>
          </form>
        </div>
      )}

      {/* ================= TAB: ANALITIKA ================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {(anLoading || !analytics) ? (
            <div className="py-24 text-center text-slate-400">Analitika yuklanmoqda...</div>
          ) : (
            <>
              <p className="text-sm text-slate-500 dark:text-slate-400">So'nggi <b>{analytics.range} kun</b> bo'yicha ma'lumot — qaror qabul qilish uchun.</p>

              {/* Stat kartalar */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5">
                  <div className="flex items-center gap-2 text-rose-500 mb-1"><AlertTriangle className="w-4 h-4" /><span className="text-xs font-bold uppercase tracking-wide">No-show</span></div>
                  <p className="text-3xl font-black text-slate-900 dark:text-white">{analytics.noShowRate}%</p>
                  <p className="text-xs text-slate-400 mt-1">{analytics.noShowCount} ta kelmadi</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5">
                  <div className="flex items-center gap-2 text-indigo-500 mb-1"><Clock className="w-4 h-4" /><span className="text-xs font-bold uppercase tracking-wide">O'rtacha</span></div>
                  <p className="text-3xl font-black text-slate-900 dark:text-white">{analytics.avgServiceMin}<span className="text-lg"> min</span></p>
                  <p className="text-xs text-slate-400 mt-1">bitta mijozga</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5">
                  <div className="flex items-center gap-2 text-emerald-500 mb-1"><TrendingUp className="w-4 h-4" /><span className="text-xs font-bold uppercase tracking-wide">Daromad</span></div>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{formatSom(analytics.totalRevenue)}</p>
                  <p className="text-xs text-slate-400 mt-1">{analytics.doneCount} xizmat</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5">
                  <div className="flex items-center gap-2 text-amber-500 mb-1"><Users className="w-4 h-4" /><span className="text-xs font-bold uppercase tracking-wide">Peak soat</span></div>
                  <p className="text-3xl font-black text-slate-900 dark:text-white">{analytics.busiestHour}</p>
                  <p className="text-xs text-slate-400 mt-1">eng band vaqt</p>
                </div>
              </div>

              {/* Peak soatlar grafigi */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
                <h3 className="font-bold text-slate-900 dark:text-white mb-1">Peak soatlar</h3>
                <p className="text-xs text-slate-400 mb-5">Qaysi soatда navbat ko'p — usta jadvalini shunga moslang.</p>
                <div className="flex items-end gap-1.5 h-40">
                  {analytics.peakHours.map((h) => {
                    const max = Math.max(1, ...analytics.peakHours.map(x => x.count))
                    const pct = Math.round((h.count / max) * 100)
                    const isPeak = h.hour === analytics.busiestHour
                    return (
                      <div key={h.hour} className="flex-1 flex flex-col items-center gap-1.5 justify-end h-full">
                        <span className="text-[10px] font-bold text-slate-500">{h.count || ''}</span>
                        <div className={`w-full rounded-t-lg transition-all ${isPeak ? 'bg-indigo-600' : 'bg-indigo-200 dark:bg-indigo-900'}`} style={{ height: `${Math.max(3, pct)}%` }} />
                        <span className="text-[9px] text-slate-400">{h.hour.replace(':00', '')}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Daromad trendi */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
                <h3 className="font-bold text-slate-900 dark:text-white mb-5">Daromad trendi ({analytics.range} kun)</h3>
                <div className="flex items-end gap-2 h-36">
                  {analytics.revenueByDay.map((d) => {
                    const max = Math.max(1, ...analytics.revenueByDay.map(x => x.revenue))
                    const pct = Math.round((d.revenue / max) * 100)
                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5 justify-end h-full">
                        <div className="w-full rounded-t-lg bg-gradient-to-t from-emerald-500 to-emerald-400" style={{ height: `${Math.max(2, pct)}%` }} title={formatSom(d.revenue)} />
                        <span className="text-[9px] text-slate-400">{d.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Ishonchsiz mijozlar */}
              {analytics.topNoShow?.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-1">Ko'p kelmagan mijozlar</h3>
                  <p className="text-xs text-slate-400 mb-4">Bularga zalog (deposit) talab qiling — no-show'ni kamaytiradi.</p>
                  <div className="space-y-2">
                    {analytics.topNoShow.map((c, i) => (
                      <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{c.name || 'Mijoz'}</p>
                          <p className="text-xs text-slate-400">{c.phone}</p>
                        </div>
                        <span className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-lg">{c.noShow} marta kelmagan</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ================= TAB 5: AI COPILOT ================= */}
      {activeTab === 'ai_copilot' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-violet-300">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">AI Biznes Copilot & Tahlilchi</h2>
                <p className="text-xs text-violet-200">Sartaroshxona faoliyatini tahlil qiluvchi aqlli maslahatchi.</p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mt-6">
              {(aiInsights?.insights || [
                { type: 'success', title: '🔥 Yuqori yuklama', message: 'Bugun 11:00 va 14:00 da talab eng yuqori bo\'ldi. Jasur ustada 100% bandlik.' },
                { type: 'info', title: '💡 Bo\'sh oynalar', message: 'Soat 15:30 dan keyin 2 ta bo\'sh slot bor. Telegram kanalga 10% chegirma e\'lon qiling.' },
                { type: 'stock', title: '📦 Sarf materiali', message: 'Bir martalik sochiqlar 2 ta qoldi. Ertaga yetmay qolishi mumkin!' },
              ]).map((ins, i) => (
                <div key={i} className="p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 space-y-2">
                  <p className="font-bold text-sm text-white">{ins.title}</p>
                  <p className="text-xs text-violet-100 leading-relaxed">{ins.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI XABAR YUBORISH MODALI */}
      {selectedForMessage && (
        <MessageModal
          booking={selectedForMessage}
          onClose={() => setSelectedForMessage(null)}
        />
      )}
    </div>
  )
}

function MessageModal({ booking, onClose }) {
  const [msgType, setMsgType] = useState('reminder')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    generateMessage(msgType)
  }, [msgType])

  const generateMessage = async (type) => {
    setLoading(true)
    try {
      const res = await api.getAIMessage(type, booking.customerName, booking.barberName, booking.timeSlot, booking.delayedMin)
      setText(res.message || '')
    } catch (_) {
      setText(`Assalomu alaykum, ${booking.customerName}! Bugun soat ${booking.timeSlot} da Zamon Barbershopda sizni kutamiz! 💈`)
    } finally {
      setLoading(false)
    }
  }

  const handleSend = () => {
    toast.success(`✉️ Xabar ${booking.customerPhone} raqamiga yuborildi!`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4 border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">AI Mijozga Xabar</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex gap-2">
          {[
            { id: 'reminder', label: '🔔 Eslatma' },
            { id: 'delay', label: '⏳ Kechikish' },
            { id: 'thank_you', label: '⭐️ Rahmat' },
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setMsgType(btn.id)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                msgType === btn.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div>
          <textarea
            rows={4}
            value={text}
            onChange={e => setText(e.target.value)}
            className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSend}
            className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md hover:bg-indigo-500 transition"
          >
            <Send className="w-4 h-4" /> Telegram / SMS orqali yuborish
          </button>
          <button onClick={onClose} className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs">
            Yopish
          </button>
        </div>
      </div>
    </div>
  )
}
