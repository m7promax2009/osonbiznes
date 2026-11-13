import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { DollarSign, CheckCircle, XCircle, Clock, Search, ChevronDown, Calendar, Check, Ban } from 'lucide-react'
import api from '../../services/api'
import { SkeletonRows } from '../../components/Skeleton'
import { toast } from '../../components/Toast'

export default function AdminPayments() {
  const { t } = useTranslation()
  const [payments, setPayments] = useState([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [processingId, setProcessingId] = useState(null)

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

  const handleApprove = async (paymentId, userName, tariff) => {
    try {
      setProcessingId(paymentId)
      await api.approveAdminPayment(paymentId)
      toast.success(`${userName} ning ${tariff?.toUpperCase()} tarifi tasdiqlandi va faollashtirildi!`)
      loadPayments()
    } catch (err) {
      toast.error(err.message || 'Xatolik yuz berdi')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (paymentId) => {
    if (!confirm('Rostdan ham ushbu to\'lovni rad etmoqchimisiz?')) return
    try {
      setProcessingId(paymentId)
      await api.rejectAdminPayment(paymentId)
      toast.info('To\'lov rad etildi')
      loadPayments()
    } catch (err) {
      toast.error(err.message || 'Xatolik yuz berdi')
    } finally {
      setProcessingId(null)
    }
  }

  const formatPrice = (p) => new Intl.NumberFormat('ru-RU').format(p || 0) + " so'm"
  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('uz-UZ')
  }

  const statusConfig = {
    success: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100', label: t('adminPay.statusSuccess') || 'Tasdiqlangan' },
    pending: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100', label: t('adminPay.statusPending') || 'Kutilmoqda' },
    failed: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: t('adminPay.statusFailed') || 'Rad etilgan' },
    refunded: { icon: XCircle, color: 'text-purple-600', bg: 'bg-purple-100', label: t('adminPay.statusRefunded') || 'Qaytarilgan' },
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
          {['all', 'pending', 'success', 'failed'].map(f => (
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
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((payment) => {
                const cfg = statusConfig[payment.status] || statusConfig.pending
                const Icon = cfg.icon
                const isProcessing = processingId === payment._id

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
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-700 uppercase">
                        {payment.tariff || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <span className="uppercase">{payment.method === 'transfer' ? "Kartaga o'tkazma" : payment.method}</span>
                      {payment.metadata?.payerCardLast4 && (
                        <div className="text-xs font-mono text-slate-500">karta *{payment.metadata.payerCardLast4}</div>
                      )}
                      {payment.transactionId && (
                        <div className="text-xs font-mono text-slate-400">{payment.transactionId}</div>
                      )}
                      {payment.metadata?.billingCycle === 'yearly' && (
                        <div className="text-[10px] font-bold text-emerald-600">1 yillik</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(payment.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {payment.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleApprove(payment._id, payment.userId?.name || 'Foydalanuvchi', payment.tariff)}
                            disabled={isProcessing}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition flex items-center gap-1 shadow-sm disabled:opacity-50"
                            title="To'lovni tasdiqlash & obunani faollashtirish"
                          >
                            <Check className="w-3.5 h-3.5" /> Tasdiqlash
                          </button>
                          <button
                            onClick={() => handleReject(payment._id)}
                            disabled={isProcessing}
                            className="px-2.5 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-semibold hover:bg-rose-100 transition flex items-center gap-1 disabled:opacity-50"
                            title="To'lovni rad etish"
                          >
                            <Ban className="w-3.5 h-3.5" /> Rad
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-mono">
                          {payment.status === 'success' ? 'Bajarilgan' : 'Yopilgan'}
                        </span>
                      )}
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

