import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { DollarSign, CheckCircle, XCircle, Clock, Search, ChevronDown, Calendar } from 'lucide-react'
import api from '../../services/api'
import { SkeletonRows } from '../../components/Skeleton'

export default function AdminPayments() {
  const { t } = useTranslation()
  const [payments, setPayments] = useState([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadPayments()
  }, [filter])

  const loadPayments = async () => {
    try {
      setLoading(true)
      const params = {}
      if (filter !== 'all') params.status = filter
      const data = await api.getAdminPayments(params)
      setPayments(data.data || [])
      setTotalRevenue(data.totalRevenue || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (p) => new Intl.NumberFormat('uz-UZ').format(p || 0) + " so'm"
  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('uz-UZ')
  }

  const statusConfig = {
    success: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100', label: t('adminPay.statusSuccess') },
    pending: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100', label: t('adminPay.statusPending') },
    failed: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: t('adminPay.statusFailed') },
    refunded: { icon: XCircle, color: 'text-purple-600', bg: 'bg-purple-100', label: t('adminPay.statusRefunded') },
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('adminPay.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('adminPay.totalRevenue')}: <span className="font-bold text-emerald-600">{formatPrice(totalRevenue)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {['all', 'success', 'pending', 'failed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f === 'all' ? t('common.all') : statusConfig[f]?.label || f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('adminPay.colUser')}</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('adminPay.colAmount')}</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('adminPay.colTariff')}</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('adminPay.colMethod')}</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('adminPay.colStatus')}</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('adminPay.colDate')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((payment) => {
                const cfg = statusConfig[payment.status] || statusConfig.pending
                const Icon = cfg.icon

                return (
                  <tr key={payment._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-800">{payment.userId?.name || t('adminPay.unknownUser')}</p>
                      <p className="text-xs text-slate-500">{payment.userId?.business || ''}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-800">{formatPrice(payment.amount)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                        {payment.tariff || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 uppercase">{payment.method}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        {formatDate(payment.createdAt)}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {loading && (
          <div className="p-4"><SkeletonRows rows={6} /></div>
        )}
        {!loading && payments.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
            <p>{t('adminPay.empty')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
