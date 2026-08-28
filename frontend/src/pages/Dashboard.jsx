import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp,
  ShoppingBag,
  Users,
  AlertCircle,
  Calendar,
  ArrowUp,
  RefreshCw,
  Sparkles,
  CreditCard,
  Package,
  Printer,
  ChevronRight,
  Zap,
  Clock,
  PieChart as PieIcon,
  DollarSign,
  Activity,
  CheckCircle2,
  BarChart2,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'
import api from '../services/api'
import ThermalReceiptModal from '../components/ThermalReceiptModal'
import sounds from '../utils/audio'

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ todayRevenue: 0, today: 0, total: 0, pending: 0, avgOrder: 0 })
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState(null)
  const [timeRange, setTimeRange] = useState('7d')
  const [chartData, setChartData] = useState([])
  const [categoryData, setCategoryData] = useState([])
  const [hourlyData, setHourlyData] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [netProfit, setNetProfit] = useState(0)
  const [profitMargin, setProfitMargin] = useState(0)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    loadAnalytics(timeRange)
  }, [timeRange])

  const loadAnalytics = async (range) => {
    try {
      setAnalyticsLoading(true)
      const analytics = await api.getOrderAnalytics(range)
      if (analytics?.chartData) setChartData(analytics.chartData)
      if (analytics?.categoryData) setCategoryData(analytics.categoryData)
      if (analytics?.hourlyData) setHourlyData(analytics.hourlyData)
      if (analytics?.topProducts) setTopProducts(analytics.topProducts)
      if (analytics?.netProfit !== undefined) setNetProfit(analytics.netProfit)
      if (analytics?.profitMargin !== undefined) setProfitMargin(analytics.profitMargin)
    } catch (err) {
      // analitika yuklashda xatolik — grafik bo'sh ko'rinadi
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      const [orderStats, ordersData] = await Promise.all([
        api.getOrderStats().catch(() => null),
        api.getOrders().catch(() => null),
      ])

      if (orderStats) {
        setStats({
          todayRevenue: orderStats.todayRevenue || 0,
          today: orderStats.today || 0,
          total: orderStats.total || 0,
          pending: orderStats.pending || 0,
          // Haqiqiy ko'rsatkich: o'rtacha chek = bugungi tushum / bugungi buyurtmalar soni
          avgOrder: orderStats.today > 0 ? Math.round((orderStats.todayRevenue || 0) / orderStats.today) : 0,
        })
      }

      if (ordersData?.data) {
        setRecentOrders(ordersData.data.slice(0, 6))
      }
    } catch (err) {
      setError('Ma\'lumotlarni yuklashda xatolik: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (p) => new Intl.NumberFormat('uz-UZ').format(p || 0) + " so'm"

  const statCards = [
    {
      title: 'Bugungi Tushum',
      value: formatPrice(stats.todayRevenue),
      subtext: 'bugungi kassa tushumi',
      icon: TrendingUp,
      gradient: 'from-emerald-500/20 via-emerald-500/10 to-transparent',
      borderColor: 'border-emerald-500/30',
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'Bugungi Buyurtmalar',
      value: `${stats.today} ta`,
      subtext: 'kassa va bot orqali',
      icon: ShoppingBag,
      gradient: 'from-blue-500/20 via-blue-500/10 to-transparent',
      borderColor: 'border-blue-500/30',
      iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    {
      title: "O'rtacha Chek",
      value: formatPrice(stats.avgOrder),
      subtext: "bugungi o'rtacha buyurtma summasi",
      icon: DollarSign,
      gradient: 'from-indigo-500/20 via-indigo-500/10 to-transparent',
      borderColor: 'border-indigo-500/30',
      iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    },
    {
      title: 'Kutilayotgan Buyurtmalar',
      value: `${stats.pending} ta`,
      subtext: 'tasdiqlash kutilmoqda',
      icon: AlertCircle,
      gradient: 'from-amber-500/20 via-amber-500/10 to-transparent',
      borderColor: 'border-amber-500/30',
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Receipt Printable Modal */}
      <ThermalReceiptModal
        order={selectedOrderForReceipt}
        onClose={() => setSelectedOrderForReceipt(null)}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Boshqaruv Paneli
            <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full font-semibold border border-emerald-500/20">
              Real-time
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Bugungi sotuv va ombor holatining real-vaqtdagi tahlili.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <Calendar className="w-4 h-4 text-emerald-600" />
            {new Date().toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <button
            onClick={() => {
              sounds.playClick()
              loadData()
              loadAnalytics(timeRange)
            }}
            className="btn-secondary p-2.5 rounded-xl shadow-xs"
            title="Ma'lumotlarni yangilash"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* AI Business Co-Pilot Header Highlight Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-indigo-950 text-white shadow-xl relative overflow-hidden border border-emerald-500/30">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-emerald-300 shadow-md">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-wide">OsonAI Biznes Tahlili</span>
                <span className="text-[10px] bg-emerald-500 text-white font-mono px-2 py-0.5 rounded-full font-bold">
                  AI Tavsiya
                </span>
              </div>
              <p className="text-sm text-emerald-100/90 mt-1 max-w-2xl leading-relaxed">
                📊 Quyidagi grafiklar <strong>real buyurtmalaringiz</strong> asosida tuzilgan. 
                Telegram bot orqali yangi buyurtmalarni qabul qiling va daromadingizni oshiring!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                sounds.playClick()
                navigate('/pos')
              }}
              className="btn-primary bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 shadow-lg border-0"
            >
              <CreditCard className="w-4 h-4" /> Kassa (POS)
            </button>
            <button
              onClick={() => {
                sounds.playClick()
                navigate('/telegram')
              }}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold transition"
            >
              Bot Marketing
            </button>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div
              key={idx}
              className={`card p-5 relative overflow-hidden bg-gradient-to-b ${stat.gradient} border ${stat.borderColor} hover:scale-[1.02] transition-transform duration-200`}
            >
              {loading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center rounded-2xl">
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {stat.title}
                </span>
                <div className={`p-2.5 rounded-xl ${stat.iconBg} shadow-xs`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                {stat.value}
              </p>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-400 dark:text-slate-500">{stat.subtext}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Revenue Chart (Spans 2 cols) */}
        <div className="lg:col-span-2 card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" /> Kunlik Tushum Dinamikasi
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {timeRange === '7d' ? 'Oxirgi 7 kun' : 'Oxirgi 30 kun'} — real buyurtmalar asosida
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {['7d', '30d'].map((range) => (
                <button
                  key={range}
                  onClick={() => {
                    sounds.playClick()
                    setTimeRange(range)
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                    timeRange === range
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {range === '7d' ? '7 Kun' : '30 Kun'}
                </button>
              ))}
            </div>
          </div>

          <div className="h-72 w-full pt-4 relative">
            {analyticsLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-slate-900/70 z-10 rounded-xl">
                <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {chartData.length === 0 && !analyticsLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                <BarChart2 className="w-12 h-12 opacity-30" />
                <p className="text-sm">Bu davr uchun buyurtma yo'q</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTushum" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(val, name) => [
                      name === 'tushum' ? `${new Intl.NumberFormat('uz-UZ').format(val)} so'm` : `${val} ta`,
                      name === 'tushum' ? 'Tushum' : 'Buyurtmalar',
                    ]}
                  />
                  <Area type="monotone" dataKey="tushum" name="tushum" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorTushum)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Sales Distribution Pie Chart */}
        <div className="card p-6 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-indigo-600" /> Kategoriyalar Ulushi
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sotuvlarning sohalar bo'yicha taqsimoti
            </p>
          </div>

          {categoryData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 py-8">
              <PieIcon className="w-12 h-12 opacity-20" />
              <p className="text-xs text-center">Kategoriya ma'lumoti<br/>hali mavjud emas</p>
            </div>
          ) : (
            <>
              <div className="h-52 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => [`${val}%`, '']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                    {categoryData.reduce((s, c) => s + c.value, 0)}%
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Jami</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-semibold pt-2 border-t border-slate-100 dark:border-slate-800">
                {categoryData.map((cat, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-slate-600 dark:text-slate-300 truncate">{cat.name} ({cat.value}%)</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Hourly Bar Chart */}
      {hourlyData.length > 0 && (
        <div className="card p-6">
          <div className="mb-4">
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" /> Bugungi Soatlik Buyurtmalar
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kun davomida buyurtmalar qaysi soatlarda ko'p kelgan
            </p>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData} margin={{ top: 5, right: 10, left: -30, bottom: 0 }}>
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                  formatter={(val) => [`${val} ta`, 'Buyurtma']}
                />
                <Bar dataKey="orders" name="Buyurtma" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Net Profit & Top Products Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Net Profit & Margin Card */}
        <div className="card p-6 bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-extrabold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full backdrop-blur-xs">
                {timeRange === '30d' ? '30 Kunlik' : '7 Kunlik'} Hisobot
              </span>
              <DollarSign className="w-6 h-6 text-emerald-200" />
            </div>
            <h3 className="text-sm font-medium text-emerald-100">Sof Foyda (Tushum - Tannarx)</h3>
            <p className="text-3xl font-extrabold tracking-tight mt-1 text-white">
              {formatPrice(netProfit)}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-white/20 flex items-center justify-between text-xs font-semibold">
            <div>
              <p className="text-emerald-200">Rentabellik (Marja):</p>
              <p className="text-lg font-bold text-white">{profitMargin}%</p>
            </div>
            <div className="text-right">
              <p className="text-emerald-200">O'rtacha daromadlilik:</p>
              <p className="text-sm font-bold text-white">{profitMargin > 20 ? 'Yuqori ⭐' : 'O\'rtacha'}</p>
            </div>
          </div>
        </div>

        {/* Top Selling Products List */}
        <div className="card p-6 lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" /> Eng Ko'p Sotilgan Mahsulotlar (Top 5)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Savdoda eng yuqori daromad keltirgan tovarlar
              </p>
            </div>
            <button
              onClick={() => navigate('/products')}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
            >
              Ombor <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {topProducts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-6">
              <Package className="w-10 h-10 opacity-30 mb-2" />
              <p className="text-xs">Hozircha yetarli savdo ma'lumoti yo'q</p>
            </div>
          ) : (
            <div className="space-y-2.5 flex-1">
              {topProducts.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-emerald-500/30 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{p.category} • {p.qty} dona sotilgan</p>
                    </div>
                  </div>
                  <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">
                    {formatPrice(p.total)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card overflow-hidden">
        <div className="p-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-600" /> Oxirgi Buyurtmalar
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Eng so'nggi amalga oshirilgan savdolar
            </p>
          </div>
          <button
            onClick={() => {
              sounds.playClick()
              navigate('/orders')
            }}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            Barchasini Ko'rish <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {recentOrders.length === 0 && !loading ? (
          <div className="py-16 text-center text-slate-400">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Hozircha buyurtmalar yo'q</p>
            <button
              onClick={() => navigate('/pos')}
              className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition"
            >
              Kassaga o'tish
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Mijoz</th>
                  <th className="px-6 py-3.5">Summa</th>
                  <th className="px-6 py-3.5">To'lov Usuli</th>
                  <th className="px-6 py-3.5">Holat</th>
                  <th className="px-6 py-3.5 text-right">Chek</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                {recentOrders.map((ord) => (
                  <tr key={ord._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{ord.customer}</div>
                      <div className="text-xs text-slate-400 font-mono">{ord.orderNumber || ord._id?.toString().slice(-8)}</div>
                    </td>
                    <td className="px-6 py-4 font-extrabold text-emerald-600 dark:text-emerald-400">
                      {formatPrice(ord.total)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {ord.paymentMethod || 'Naqd'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {ord.status === 'completed' && <span className="badge-green"><CheckCircle2 className="w-3 h-3" /> Bajarildi</span>}
                      {ord.status === 'pending' && <span className="badge-yellow"><Clock className="w-3 h-3" /> Kutilmoqda</span>}
                      {ord.status === 'processing' && <span className="badge-blue"><Activity className="w-3 h-3" /> Ishlanmoqda</span>}
                      {ord.status === 'cancelled' && <span className="badge-red"><AlertCircle className="w-3 h-3" /> Bekor</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          sounds.playClick()
                          setSelectedOrderForReceipt(ord)
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-xs"
                      >
                        <Printer className="w-3.5 h-3.5" /> Chek
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
