import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Plus, Store, Mail, Phone, Calendar, ChevronDown, CheckCircle, XCircle, Shield } from 'lucide-react'
import api from '../../services/api'
import { useDebouncedValue } from '../../hooks/useDebounce'
import { SkeletonRows } from '../../components/Skeleton'

export default function AdminUsers() {
  const { t } = useTranslation()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tariffFilter, setTariffFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', business: '', phone: '', tariff: 'trial' })
  const [error, setError] = useState('')
  const debouncedSearch = useDebouncedValue(search, 400)

  useEffect(() => {
    loadUsers()
  }, [debouncedSearch, tariffFilter])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const params = {}
      if (debouncedSearch) params.search = debouncedSearch
      if (tariffFilter !== 'all') params.tariff = tariffFilter
      const data = await api.getAdminUsers(params)
      setUsers(data.data || [])
      setError('') // muvaffaqiyatli yuklashda eski xatoni tozalaymiz
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.createAdminUser(form)
      setShowModal(false)
      setForm({ name: '', email: '', password: '', business: '', phone: '', tariff: 'trial' })
      loadUsers()
    } catch (err) {
      setError(err.message)
      alert(err.message) // modal ortida qolmasligi uchun
    }
  }

  const toggleUserStatus = async (id, currentStatus) => {
    try {
      await api.updateAdminUser(id, { isActive: !currentStatus })
      loadUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('uz-UZ')
  }

  const tariffColors = {
    trial: 'bg-amber-100 text-amber-700',
    start: 'bg-blue-100 text-blue-700',
    pro: 'bg-emerald-100 text-emerald-700',
    business: 'bg-purple-100 text-purple-700',
    blocked: 'bg-red-100 text-red-700',
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('adminUsers.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('adminUsers.userCount', { count: users.length })}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          {t('adminUsers.newUser')}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
          <input
            type="text"
            placeholder={t('adminUsers.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <select
          value={tariffFilter}
          onChange={e => setTariffFilter(e.target.value)}
          className="input-field w-auto"
        >
          <option value="all">{t('adminUsers.allTariffs')}</option>
          <option value="trial">{t('adminUsers.tariffTrial')}</option>
          <option value="start">{t('adminUsers.tariffStart')}</option>
          <option value="pro">{t('adminUsers.tariffPro')}</option>
          <option value="business">{t('adminUsers.tariffBusiness')}</option>
          <option value="blocked">{t('adminUsers.tariffBlocked')}</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('adminUsers.colUser')}</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('adminUsers.colBusiness')}</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('adminUsers.colTariff')}</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('adminUsers.colStatus')}</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('adminUsers.colRegistered')}</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('adminUsers.colAction')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                        {user.name?.[0] || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{user.name}</p>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Mail className="w-3 h-3" aria-hidden="true" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-700">{user.business || '-'}</p>
                    {user.phone && <p className="text-xs text-slate-500">{user.phone}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${tariffColors[user.tariff] || 'bg-slate-100 text-slate-600'}`}>
                      {user.tariff}
                    </span>
                    {user.tariff === 'trial' && (
                      <p className="text-xs text-slate-500 mt-1">{t('adminUsers.daysLeft', { count: user.trialDaysLeft })}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {user.isActive ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle className="w-3 h-3" /> {t('adminUsers.statusActive')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-red-600">
                        <XCircle className="w-3 h-3" /> {t('adminUsers.statusBlocked')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      {formatDate(user.createdAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => toggleUserStatus(user._id, user.isActive)}
                      aria-label={user.isActive ? t('adminUsers.blockUser', { name: user.name }) : t('adminUsers.activateUser', { name: user.name })}
                      className={`p-2 rounded-lg transition ${
                        user.isActive ? 'hover:bg-red-50 text-red-500' : 'hover:bg-emerald-50 text-emerald-500'
                      }`}
                    >
                      {user.isActive ? <XCircle className="w-4 h-4" aria-hidden="true" /> : <CheckCircle className="w-4 h-4" aria-hidden="true" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && (
          <div className="p-4"><SkeletonRows rows={6} /></div>
        )}
        {!loading && users.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Store className="w-12 h-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
            <p>{t('adminUsers.notFound')}</p>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-bold text-slate-800">{t('adminUsers.modalTitle')}</h3>
              <button onClick={() => setShowModal(false)} aria-label={t('common.close')} className="p-2 hover:bg-slate-100 rounded-lg">
                <XCircle className="w-5 h-5 text-slate-500" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('adminUsers.fieldName')}</label>
                  <input required className="input-field" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('common.email')}</label>
                  <input required type="email" className="input-field" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('adminUsers.fieldPassword')}</label>
                  <input required type="password" className="input-field" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('adminUsers.fieldBusiness')}</label>
                  <input className="input-field" value={form.business} onChange={e => setForm({...form, business: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('common.phone')}</label>
                  <input className="input-field" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('adminUsers.fieldTariff')}</label>
                  <select className="input-field" value={form.tariff} onChange={e => setForm({...form, tariff: e.target.value})}>
                    <option value="trial">{t('adminUsers.tariffTrialOption')}</option>
                    <option value="start">{t('adminUsers.tariffStartOption')}</option>
                    <option value="pro">{t('adminUsers.tariffProOption')}</option>
                    <option value="business">{t('adminUsers.tariffBusinessOption')}</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">{t('common.cancel')}</button>
                <button type="submit" className="btn-primary flex-1">{t('adminUsers.create')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
