import React, { useState, useEffect } from 'react'
import { CreditCard, AlertTriangle, CheckCircle, TrendingUp, Users, Store } from 'lucide-react'
import api from '../../services/api'

export default function AdminSubscriptions() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const subs = await api.getAdminSubscriptions()
      setData(subs)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">{error}</div>
    )
  }

  if (!data) return null

  const tariffLabels = {
    trial: 'Trial',
    start: 'Start',
    pro: 'Pro',
    business: 'Biznes',
    blocked: 'Bloklangan',
  }

  const tariffColors = {
    trial: 'bg-amber-500',
    start: 'bg-blue-500',
    pro: 'bg-emerald-500',
    business: 'bg-purple-500',
    blocked: 'bg-red-500',
  }

  const total = data.total || 0

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Obunalar</h1>
        <p className="text-sm text-slate-500 mt-1">Tariflar bo'yicha statistika</p>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-emerald-50 rounded-lg">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{total}</p>
          <p className="text-sm text-slate-500">Jami foydalanuvchilar</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-amber-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{data.expiringTrials || 0}</p>
          <p className="text-sm text-slate-500">3 kunda trial tugaydi</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-red-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{data.expiredSubscriptions || 0}</p>
          <p className="text-sm text-slate-500">Muddati o'tgan obunalar</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-blue-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{data.breakdown?.filter(b => b._id !== 'trial').reduce((s, b) => s + b.count, 0) || 0}</p>
          <p className="text-sm text-slate-500">To'lovchi foydalanuvchilar</p>
        </div>
      </div>

      {/* Tariff breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-bold text-slate-800 mb-6">Tariflar bo'yicha taqsimot</h3>

        <div className="space-y-5">
          {data.breakdown?.map((item) => {
            const percent = total > 0 ? (item.count / total) * 100 : 0
            return (
              <div key={item._id}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${tariffColors[item._id] || 'bg-slate-400'}`} />
                    <span className="text-sm font-medium text-slate-700">{tariffLabels[item._id] || item._id}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-800">{item.count}</span>
                    <span className="text-xs text-slate-500 w-10 text-right">{percent.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${tariffColors[item._id] || 'bg-slate-400'}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {(!data.breakdown || data.breakdown.length === 0) && (
          <div className="text-center py-8 text-slate-500">
            <Store className="w-10 h-10 mx-auto mb-2 opacity-50" aria-hidden="true" />
            <p className="text-sm">Ma'lumot yo'q</p>
          </div>
        )}
      </div>
    </div>
  )
}
