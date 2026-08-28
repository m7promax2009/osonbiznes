import React, { useState, useEffect } from 'react'
import {
  Search,
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  ChevronDown,
  ShoppingCart,
  MapPin,
  Kanban,
  List,
  Printer,
  X,
  Sparkles,
  Download,
} from 'lucide-react'
import api from '../services/api'
import ThermalReceiptModal from '../components/ThermalReceiptModal'
import sounds from '../utils/audio'
import { useDebouncedValue } from '../hooks/useDebounce'
import { toast } from '../components/Toast'
import { exportToCSV } from '../utils/export'

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('kanban') // 'kanban' | 'list'
  const [search, setSearch] = useState('')
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState(null)
  const [selectedMapOrder, setSelectedMapOrder] = useState(null)
  const [error, setError] = useState('')
  const debouncedSearch = useDebouncedValue(search, 400)

  useEffect(() => {
    loadOrders()
  }, [debouncedSearch])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const data = await api.getOrders({ search: debouncedSearch })
      setOrders(data?.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    sounds.playClick()
    const headers = {
      orderNumber: 'Buyurtma Raqami',
      customer: 'Mijoz',
      phone: 'Telefon',
      itemsCount: 'Mahsulotlar Soni',
      total: 'Summa (so\'m)',
      status: 'Status',
      paymentMethod: 'To\'lov Usuli',
      source: 'Manba',
      createdAt: 'Sana',
    }
    const rows = orders.map(o => ({
      orderNumber: o.orderNumber || o._id?.slice(-6) || '',
      customer: o.customer || 'Noma\'lum',
      phone: o.phone || '',
      itemsCount: o.items?.reduce((s, i) => s + (i.qty || 1), 0) || 0,
      total: o.total || 0,
      status: o.status,
      paymentMethod: o.paymentMethod || 'Naqd',
      source: o.source || 'manual',
      createdAt: o.createdAt ? new Date(o.createdAt).toLocaleString('uz-UZ') : '',
    }))
    exportToCSV('Buyurtmalar_Hisoboti', headers, rows)
  }

  const updateStatus = async (orderId, newStatus) => {
    sounds.playClick()
    const prevOrders = orders
    // Optimistik yangilash
    setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o))
    try {
      await api.updateOrderStatus(orderId, { status: newStatus })
    } catch (err) {
      // Xato bo'lsa avvalgi holatga qaytaramiz (aks holda UI serverdan chalg'iydi)
      setOrders(prevOrders)
      toast.error(err.message)
    }
  }

  const formatPrice = (p) => new Intl.NumberFormat('uz-UZ').format(p || 0) + " so'm"

  const kanbanColumns = [
    { id: 'pending', title: 'Kutilmoqda', color: 'border-amber-500 bg-amber-500/10 text-amber-600' },
    { id: 'processing', title: 'Yetkazilmoqda', color: 'border-blue-500 bg-blue-500/10 text-blue-600' },
    { id: 'completed', title: 'Bajarildi', color: 'border-emerald-500 bg-emerald-500/10 text-emerald-600' },
    { id: 'cancelled', title: 'Bekor', color: 'border-rose-500 bg-rose-500/10 text-rose-600' },
  ]

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <ThermalReceiptModal
        order={selectedReceiptOrder}
        onClose={() => setSelectedReceiptOrder(null)}
      />

      {/* Courier Delivery Map Modal Simulator */}
      {selectedMapOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-600 font-extrabold">
                <Truck className="w-5 h-5 animate-pulse" />
                <span>Kuryer GPS Trekker (Live Location)</span>
              </div>
              <button onClick={() => setSelectedMapOrder(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Styled Map Graphic View */}
            <div className="relative w-full h-64 bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
              <div className="text-center z-10 space-y-2">
                <MapPin className="w-10 h-10 text-rose-500 mx-auto animate-bounce" />
                <p className="font-extrabold text-white text-sm">{selectedMapOrder.customer}</p>
                <p className="text-xs text-slate-400">{selectedMapOrder.address || 'Toshkent sh'}</p>
                <span className="inline-block text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30">
                  Kuryer Yoʻlda (Tez orada yetib boradi)
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={() => setSelectedMapOrder(null)} className="btn-primary py-2 px-4 font-bold text-xs">
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Buyurtmalar Boshqaruvi
            <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full font-bold font-mono border border-emerald-500/20">
              Kanban & Live Tracking
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Buyurtmalarni status boʻyicha ustunlarda surish va kuzatish
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

          {/* View Mode Switcher */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => {
                sounds.playClick()
                setViewMode('kanban')
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" /> Kanban
            </button>
            <button
              onClick={() => {
                sounds.playClick()
                setViewMode('list')
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Jadval
            </button>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buyurtma ID, mijoz nomi yoki manzil boʻyicha..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {/* Kanban Board View */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {kanbanColumns.map(col => {
            const colOrders = orders.filter(o => o.status === col.id)
            return (
              <div key={col.id} className="bg-slate-100/70 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${col.color}`}>
                    {col.title} ({colOrders.length})
                  </span>
                </div>

                <div className="space-y-3 min-h-[300px]">
                  {colOrders.map(order => (
                    <div
                      key={order._id}
                      className="card p-4 hover:scale-[1.02] transition-transform duration-150 space-y-2 border-l-4 border-l-emerald-500"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {order.orderNumber || order._id}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          {order.paymentMethod || 'Naqd'}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">{order.customer}</h4>
                      <p className="text-[11px] text-slate-500 truncate">{order.address || 'Toshkent sh.'}</p>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                          {formatPrice(order.total)}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setSelectedMapOrder(order)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-blue-600"
                            title="Xaritada Kuzatish"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSelectedReceiptOrder(order)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-emerald-600"
                            title="Chek Chiqarish"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Status Selector dropdown */}
                      <select
                        value={order.status}
                        onChange={e => updateStatus(order._id, e.target.value)}
                        className="w-full text-[10px] font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1 outline-none text-slate-700 dark:text-slate-300"
                      >
                        <option value="pending">Kutilmoqda</option>
                        <option value="processing">Yetkazilmoqda</option>
                        <option value="completed">Bajarildi</option>
                        <option value="cancelled">Bekor qilindi</option>
                      </select>
                    </div>
                  ))}

                  {colOrders.length === 0 && (
                    <div className="text-center py-12 text-slate-400 text-xs italic">
                      Buyurtmalar yoʻq
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* List View */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs font-bold uppercase">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Mijoz</th>
                  <th className="px-6 py-4">Summa</th>
                  <th className="px-6 py-4">Holat</th>
                  <th className="px-6 py-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.map(order => (
                  <tr key={order._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-6 py-4 font-mono font-bold text-emerald-600">{order.orderNumber || order._id}</td>
                    <td className="px-6 py-4 font-bold">{order.customer}</td>
                    <td className="px-6 py-4 font-extrabold">{formatPrice(order.total)}</td>
                    <td className="px-6 py-4">
                      <span className="badge-green">{order.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setSelectedReceiptOrder(order)} className="btn-secondary text-xs py-1 px-3">
                        <Printer className="w-3.5 h-3.5" /> Chek
                      </button>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-14 text-center">
                      <ShoppingCart className="w-10 h-10 mx-auto text-slate-300 mb-2" aria-hidden="true" />
                      <p className="text-sm text-slate-400">Buyurtmalar yo'q. Yangi buyurtmalar shu yerda ko'rinadi.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
