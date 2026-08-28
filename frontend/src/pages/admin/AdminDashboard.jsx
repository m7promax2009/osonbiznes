import React, { useState, useEffect } from 'react'
import { Users, Store, DollarSign, CreditCard, TrendingUp, Calendar, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import api from '../../services/api'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const data = await api.getAdminDashboard()
      setStats(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (p) => new Intl.NumberFormat('uz-UZ').format(p || 0) + " so'm"

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
        {error}
      </div>
    )
  }

  if (!stats) return null

  const statCards = [
    {
      title: "Do'kon egalari",
      value: stats.totalShops,
      sub: `${stats.activeShops} faol`,
      icon: Store,
      color: 'emerald',
    },
    {
      title: 'Faol obunalar',
      value: stats.paidShops,
      sub: `${stats.trialShops} trial`,
      icon: CreditCard,
      color: 'blue',
    },
    {
      title: 'Jami buyurtmalar',
      value: stats.totalOrders,
      sub: formatPrice(stats.totalRevenue),
      icon: TrendingUp,
      color: 'purple',
    },
    {
      title: 'Oylik daromad',
      value: formatPrice(stats.monthlyRevenue),
      sub: 'jami to\'lovlar',
      icon: DollarSign,
      color: 'amber',
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Platforma statistikasi va boshqaruvi</p>
        </div>
        <button
          onClick={loadStats}
          className="btn-secondary text-sm"
        >
          Yangilash
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, idx) => {
          const Icon = card.icon
          const colorClasses = {
            emerald: 'bg-emerald-50 text-emerald-600',
            blue: 'bg-blue-50 text-blue-600',
            purple: 'bg-purple-50 text-purple-600',
            amber: 'bg-amber-50 text-amber-600',
          }

          return (
            <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 rounded-lg ${colorClasses[card.color]}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              <p className="text-sm text-slate-500 mt-1">{card.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{card.sub}</p>
            </div>
          )
        })}
      </div>

      {/* Recent shops & payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent shop owners */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6 pb-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Oxirgi ro'yxatdan o'tganlar</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {stats.recentShops?.length > 0 ? stats.recentShops.map((shop) => (
              <div key={shop._id} className="p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                  {shop.name?.[0] || 'U'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">{shop.name}</p>
                  <p className="text-xs text-slate-500">{shop.email}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  shop.tariff === 'pro' ? 'bg-emerald-100 text-emerald-700' :
                  shop.tariff === 'start' ? 'bg-blue-100 text-blue-700' :
                  shop.tariff === 'trial' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {shop.tariff}
                </span>
              </div>
            )) : (
              <div className="p-6 text-center text-slate-500 text-sm">Hozircha ma'lumot yo'q</div>
            )}
          </div>
        </div>

        {/* Recent payments */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6 pb-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Oxirgi to'lovlar</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {stats.recentPayments?.length > 0 ? stats.recentPayments.map((payment) => (
              <div key={payment._id} className="p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  payment.status === 'success' ? 'bg-emerald-100' : 'bg-amber-100'
                }`}>
                  {payment.status === 'success'
                    ? <CheckCircle className="w-5 h-5 text-emerald-600" />
                    : <AlertTriangle className="w-5 h-5 text-amber-600" />
                  }
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">{payment.userId?.name || 'Noma\'lum'}</p>
                  <p className="text-xs text-slate-500">{payment.tariff} tarifi • {payment.method}</p>
                </div>
                <p className="text-sm font-bold text-slate-800">{formatPrice(payment.amount)}</p>
              </div>
            )) : (
              <div className="p-6 text-center text-slate-500 text-sm">Hozircha to'lovlar yo'q</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
