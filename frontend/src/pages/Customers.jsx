import React, { useState, useEffect } from 'react'
import {
  Search,
  Phone,
  Star,
  MapPin,
  Users,
  Crown,
  AlertCircle,
  MessageCircle,
  DollarSign,
  Plus,
  Send,
  Sparkles,
  CheckCircle2,
  Download,
  CreditCard,
  Edit2,
  Trash2,
  X,
  Calendar,
  UserPlus,
  TrendingUp,
} from 'lucide-react'
import api from '../services/api'
import sounds from '../utils/audio'
import { useDebouncedValue } from '../hooks/useDebounce'
import { SkeletonCards } from '../components/Skeleton'
import { toast } from '../components/Toast'
import { exportToCSV } from '../utils/export'

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [stats, setStats] = useState({ total: 0, vip: 0, totalDebt: 0, debtorsCount: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'debts' | 'vip'
  const [error, setError] = useState('')

  // Add / Edit Modal
  const [showModal, setShowModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    city: 'Toshkent',
    address: '',
    notes: '',
    debt: 0,
    debtDueDate: '',
    tier: 'Bronze',
  })

  // Debt Payment Modal
  const [payDebtModal, setPayDebtModal] = useState({ open: false, customer: null, amount: '' })
  const [submittingDebt, setSubmittingDebt] = useState(false)

  const debouncedSearch = useDebouncedValue(search, 400)

  useEffect(() => {
    loadCustomers()
    loadStats()
  }, [debouncedSearch])

  const loadCustomers = async () => {
    try {
      setLoading(true)
      const data = await api.getCustomers({ search: debouncedSearch })
      setCustomers(data?.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const res = await api.request('/customers/stats')
      if (res?.data) {
        setStats(res.data)
      }
    } catch (_) {}
  }

  const formatPrice = (p) => new Intl.NumberFormat('ru-RU').format(p || 0) + " so'm"

  const sendTelegramReminder = (customer) => {
    sounds.playClick()
    const msg = `Assalomu alaykum, ${customer.name}! OsonBiznes do'konimizdan ${formatPrice(customer.debt)} miqdoridagi nasiya to'lov muddati keldi. To'lovni Click / Payme orqali amalga oshirishingiz mumkin. Rahmat!`
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(msg)}`
    window.open(telegramUrl, '_blank')
  }

  const openAddModal = () => {
    sounds.playClick()
    setEditingCustomer(null)
    setFormData({
      name: '',
      phone: '',
      email: '',
      city: 'Toshkent',
      address: '',
      notes: '',
      debt: 0,
      debtDueDate: '',
      tier: 'Bronze',
    })
    setShowModal(true)
  }

  const openEditModal = (customer) => {
    sounds.playClick()
    setEditingCustomer(customer)
    setFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      city: customer.city || 'Toshkent',
      address: customer.address || '',
      notes: customer.notes || '',
      debt: customer.debt || 0,
      debtDueDate: customer.debtDueDate ? customer.debtDueDate.slice(0, 10) : '',
      tier: customer.tier || 'Bronze',
    })
    setShowModal(true)
  }

  const handleSaveCustomer = async (e) => {
    e.preventDefault()
    try {
      sounds.playClick()
      if (editingCustomer) {
        await api.updateCustomer(editingCustomer._id, formData)
        toast.success(`"${formData.name}" ma'lumotlari yangilandi`)
      } else {
        await api.createCustomer(formData)
        toast.success(`Yangi mijoz "${formData.name}" qo'shildi`)
      }
      sounds.playSuccess()
      setShowModal(false)
      loadCustomers()
      loadStats()
    } catch (err) {
      toast.error(err.message || 'Xatolik yuz berdi')
    }
  }

  const handlePayDebtSubmit = async (e) => {
    e.preventDefault()
    if (!payDebtModal.customer || !payDebtModal.amount) return
    try {
      setSubmittingDebt(true)
      const res = await api.payCustomerDebt(payDebtModal.customer._id, Number(payDebtModal.amount))
      sounds.playSuccess()
      toast.success(res.message || 'Nasiya to\'lovi muvaffaqiyatli qabul qilindi!')
      setPayDebtModal({ open: false, customer: null, amount: '' })
      loadCustomers()
      loadStats()
    } catch (err) {
      toast.error(err.message || 'To\'lovni qabul qilishda xatolik')
    } finally {
      setSubmittingDebt(false)
    }
  }

  const handleExportCSV = () => {
    sounds.playClick()
    const headers = {
      name: 'Mijoz Ismi',
      phone: 'Telefon',
      city: 'Shahar / Manzil',
      tier: 'VIP Darajasi',
      totalOrders: 'Xaridlar Soni',
      totalSpent: 'Jami Savdo (so\'m)',
      debt: 'Nasiya Qarz (so\'m)',
      cashback: 'Keshbek Balansi (so\'m)',
    }
    const rows = customers.map(c => ({
      name: c.name,
      phone: c.phone || '',
      city: c.city || c.address || 'Toshkent',
      tier: c.tier || 'Bronze',
      totalOrders: c.totalOrders || 0,
      totalSpent: c.totalSpent || 0,
      debt: c.debt || 0,
      cashback: c.cashback || 0,
    }))
    exportToCSV('Mijozlar_va_Nasiya', headers, rows)
  }

  const filteredCustomers = customers.filter(c => {
    if (activeTab === 'debts') return (c.debt || 0) > 0
    if (activeTab === 'vip') return c.tier === 'Gold' || c.tier === 'Platinum'
    return true
  })

  const tierColors = {
    Platinum: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white',
    Gold: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white',
    Silver: 'bg-gradient-to-r from-slate-400 to-slate-600 text-white',
    Bronze: 'bg-gradient-to-r from-orange-400 to-amber-700 text-white',
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Mijozlar & Nasiya CRM
            <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full font-bold font-mono border border-emerald-500/20">
              {customers.length} mijoz
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Mijozlar sodiqlik dasturi (VIP), Keshbek va Nasiya daftari
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="btn-secondary flex items-center gap-1.5 text-xs font-bold py-2.5 px-3.5"
            title="Excel formatida yuklab olish"
          >
            <Download className="w-4 h-4 text-emerald-600" /> Excel / CSV Eksport
          </button>
          <button onClick={openAddModal} className="btn-primary">
            <Plus className="w-4 h-4" /> Yangi Mijoz Qo'shish
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Jami Mijozlar</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{stats.total || customers.length}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3.5">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-xl">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Nasiyadorlar</p>
            <p className="text-xl font-extrabold text-rose-600">
              {stats.debtorsCount || customers.filter(c => c.debt > 0).length} ta
            </p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3.5">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-xl">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Jami Qarz Summasi</p>
            <p className="text-xl font-extrabold text-amber-600">
              {formatPrice(stats.totalDebt || customers.reduce((s, c) => s + (c.debt || 0), 0))}
            </p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3.5">
          <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-600 rounded-xl">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">VIP Mijozlar</p>
            <p className="text-xl font-extrabold text-purple-600">
              {customers.filter(c => c.tier === 'Gold' || c.tier === 'Platinum').length} ta
            </p>
          </div>
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Mijoz ismi, telefon raqami yoki shahar boʻyicha qidirish..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>

        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 w-full sm:w-auto">
          <button
            onClick={() => {
              sounds.playClick()
              setActiveTab('all')
            }}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'all'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Barchasi ({customers.length})
          </button>
          <button
            onClick={() => {
              sounds.playClick()
              setActiveTab('debts')
            }}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'debts'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50/50'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" /> Nasiya Daftari ({customers.filter(c => (c.debt || 0) > 0).length})
          </button>
          <button
            onClick={() => {
              sounds.playClick()
              setActiveTab('vip')
            }}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'vip'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-purple-600 dark:text-purple-400 hover:bg-purple-50/50'
            }`}
          >
            <Crown className="w-3.5 h-3.5" /> VIP
          </button>
        </div>
      </div>

      {/* Customers Cards Grid */}
      {loading ? (
        <SkeletonCards count={6} className="!grid-cols-1 md:!grid-cols-2 lg:!grid-cols-3" />
      ) : filteredCustomers.length === 0 ? (
        <div className="card p-14 text-center">
          <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" aria-hidden="true" />
          <p className="text-sm text-slate-500 font-medium">Hozircha mijozlar topilmadi.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCustomers.map(customer => {
            const hasDebt = (customer.debt || 0) > 0
            const isDebtExpired = customer.debtDueDate && new Date(customer.debtDueDate) < new Date() && hasDebt
            return (
              <div
                key={customer._id}
                className="card p-5 relative overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
              >
                {/* VIP Badge */}
                {customer.tier && (
                  <div className={`absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-xs ${tierColors[customer.tier] || tierColors.Bronze}`}>
                    <Crown className="w-3 h-3" /> {customer.tier}
                  </div>
                )}

                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-extrabold text-base shadow-md shrink-0">
                    {customer.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'M'}
                  </div>
                  <div className="min-w-0 flex-1 pr-14">
                    <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base truncate">{customer.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 font-mono truncate">
                      <Phone className="w-3 h-3 text-emerald-600 shrink-0" /> {customer.phone || 'Telefon yo\'q'}
                    </p>
                  </div>
                </div>

                {/* Stat Badges */}
                <div className="grid grid-cols-3 gap-2 text-center my-2 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{customer.totalOrders || 0}</p>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Xarid</p>
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                      {customer.totalSpent > 1000000 ? `${(customer.totalSpent / 1000000).toFixed(1)}M` : formatPrice(customer.totalSpent)}
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Jami</p>
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-purple-600 dark:text-purple-400">
                      {formatPrice(customer.cashback || 0)}
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Keshbek</p>
                  </div>
                </div>

                {/* Debt (Nasiya) Notice */}
                {hasDebt ? (
                  <div className={`p-3 rounded-xl my-2 border text-xs space-y-1.5 ${
                    isDebtExpired
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                      : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                  }`}>
                    <div className="flex justify-between items-center font-bold">
                      <span className="flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Nasiya Qarz:
                      </span>
                      <span className="text-sm font-extrabold">{formatPrice(customer.debt)}</span>
                    </div>
                    {customer.debtDueDate && (
                      <p className="text-[10px] opacity-80">
                        Muddat: {new Date(customer.debtDueDate).toLocaleDateString('uz-UZ')} {isDebtExpired ? '(MUDDATI OʻTGAN!)' : ''}
                      </p>
                    )}
                    <button
                      onClick={() => setPayDebtModal({ open: true, customer, amount: String(customer.debt) })}
                      className="w-full mt-1 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-700 transition flex items-center justify-center gap-1 shadow-xs"
                    >
                      <DollarSign className="w-3.5 h-3.5" /> Qarzni To'lash / Qisman So'ndirish
                    </button>
                  </div>
                ) : null}

                {/* Footer Action */}
                <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-400 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 shrink-0" /> {customer.city || customer.address || 'Toshkent'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {hasDebt ? (
                      <button
                        onClick={() => sendTelegramReminder(customer)}
                        className="btn-secondary text-[11px] py-1 px-2.5 font-bold text-rose-600 border-rose-200 hover:bg-rose-50 flex items-center gap-1"
                        title="Telegram orqali to'lov eslatmasi yuborish"
                      >
                        <Send className="w-3 h-3" /> Eslatma
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 inline mr-1" /> Qarzi yo'q
                      </span>
                    )}

                    <button
                      onClick={() => openEditModal(customer)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                      title="Mijozni tahrirlash"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                {editingCustomer ? 'Mijozni Tahrirlash' : 'Yangi Mijoz Qoʻshish'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Mijoz Ismi <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  className="input-field"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Masalan: Sardor Aliyev"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Telefon Raqam
                  </label>
                  <input
                    type="tel"
                    className="input-field"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+998 90 123 45 67"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Shahar / Viloyat
                  </label>
                  <input
                    className="input-field"
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Toshkent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Nasiya Qarz (so'm)
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    value={formData.debt}
                    onChange={e => setFormData({ ...formData, debt: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Qarz Muddat Sanasi
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={formData.debtDueDate}
                    onChange={e => setFormData({ ...formData, debtDueDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    VIP Darajasi
                  </label>
                  <select
                    className="input-field"
                    value={formData.tier}
                    onChange={e => setFormData({ ...formData, tier: e.target.value })}
                  >
                    <option value="Bronze">Bronze (Oddiy)</option>
                    <option value="Silver">Silver (Kumush)</option>
                    <option value="Gold">Gold (Oltin)</option>
                    <option value="Platinum">Platinum (VIP)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Manzil
                  </label>
                  <input
                    className="input-field"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Chilonzor 9, 12-uy"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Eslatma / Izoh
                </label>
                <textarea
                  className="input-field text-xs resize-none"
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Mijoz haqida maxsus eslatma..."
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Bekor qilish
                </button>
                <button type="submit" className="btn-primary flex-1 font-bold">
                  {editingCustomer ? 'Saqlash' : 'Qoʻshish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Debt Modal */}
      {payDebtModal.open && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Nasiya Qarzini To'lash
              </h3>
              <button onClick={() => setPayDebtModal({ open: false, customer: null, amount: '' })} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePayDebtSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500">Mijoz:</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{payDebtModal.customer?.name}</p>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-rose-600 font-medium">Jami Qarz:</span>
                  <span className="text-sm font-extrabold text-rose-600">{formatPrice(payDebtModal.customer?.debt)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  To'lanayotgan Summa (so'm) <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="number"
                  max={payDebtModal.customer?.debt}
                  min={100}
                  className="input-field font-bold text-emerald-600"
                  value={payDebtModal.amount}
                  onChange={e => setPayDebtModal({ ...payDebtModal, amount: e.target.value })}
                  placeholder="Summani kiriting..."
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPayDebtModal({ ...payDebtModal, amount: String(payDebtModal.customer?.debt) })}
                  className="flex-1 py-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-bold rounded-lg border border-emerald-200 dark:border-emerald-800"
                >
                  To'liq to'lash (100%)
                </button>
                <button
                  type="button"
                  onClick={() => setPayDebtModal({ ...payDebtModal, amount: String(Math.round((payDebtModal.customer?.debt || 0) / 2)) })}
                  className="flex-1 py-1.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs font-bold rounded-lg"
                >
                  50% to'lash
                </button>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPayDebtModal({ open: false, customer: null, amount: '' })}
                  className="btn-secondary flex-1"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submittingDebt}
                  className="btn-primary flex-1 font-bold flex items-center justify-center gap-1.5"
                >
                  {submittingDebt ? 'Qabul qilinmoqda...' : 'To\'lovni Tasdiqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
