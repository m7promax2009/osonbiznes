import React, { useState, useEffect, useRef } from 'react'
import {
  Bell,
  CheckCheck,
  Package,
  ShoppingBag,
  AlertTriangle,
  CreditCard,
  X,
  Clock,
  ChevronRight,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Info,
  CheckCircle2,
  Filter,
  Eye,
} from 'lucide-react'
import api from '../services/api'
import sounds from '../utils/audio'
import { useNavigate } from 'react-router-dom'
import { toast } from './Toast'

export default function NotificationsDropdown({ isAdmin = false }) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedNotif, setSelectedNotif] = useState(null)
  const [filter, setFilter] = useState('all') // all | unread | orders | payments | stock
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 20000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Disable background scrolling when modal is open
  useEffect(() => {
    if (selectedNotif) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [selectedNotif])

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications({ limit: 40 })
      const list = data?.data || []
      setNotifications(list)
      const unread = list.filter(n => !n.read && !n.isRead).length
      setUnreadCount(unread)
    } catch (_) {}
  }

  const toggleDropdown = () => {
    sounds.playClick()
    setIsOpen(!isOpen)
  }

  const handleMarkAllRead = async () => {
    sounds.playClick()
    try {
      await api.markAllNotificationsRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true, isRead: true })))
      setUnreadCount(0)
      toast.success("Barcha bildirishnomalar o'qilgan deb belgilandi")
    } catch (_) {}
  }

  const handleMarkSingleRead = async (id, e) => {
    e?.stopPropagation()
    try {
      await api.markNotificationRead(id)
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true, isRead: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
      if (selectedNotif && selectedNotif._id === id) {
        setSelectedNotif(prev => ({ ...prev, read: true, isRead: true }))
      }
    } catch (_) {}
  }

  const handleDeleteNotif = async (id, e) => {
    e?.stopPropagation()
    sounds.playClick()
    try {
      await api.deleteNotification(id)
      setNotifications(prev => prev.filter(n => n._id !== id))
      if (selectedNotif && selectedNotif._id === id) {
        setSelectedNotif(null)
      }
      toast.success("Bildirishnoma o'chirildi")
    } catch (_) {}
  }

  const handleOpenDetail = (notif) => {
    sounds.playClick()
    setSelectedNotif(notif)
    if (!notif.read && !notif.isRead) {
      handleMarkSingleRead(notif._id)
    }
  }

  const handleActionRedirect = (notif) => {
    sounds.playClick()
    setSelectedNotif(null)
    setIsOpen(false)

    if (isAdmin) {
      if (notif.type === 'admin_message' || notif.type === 'payment_success' || notif.type === 'payment_failed') {
        navigate('/admin/payments')
      } else if (notif.type === 'subscription_expired' || notif.type === 'trial_expiring') {
        navigate('/admin/subscriptions')
      } else {
        navigate('/admin/users')
      }
      return
    }

    if (notif.type === 'new_order' || notif.type === 'order' || notif.type === 'order_status') {
      navigate('/orders')
    } else if (notif.type === 'low_stock' || notif.type === 'stock') {
      navigate('/products')
    } else if (notif.type === 'new_customer' || notif.type === 'debt' || notif.type === 'customer') {
      navigate('/customers')
    } else if (notif.type === 'payment_success' || notif.type === 'payment_failed' || notif.type === 'subscription_expired' || notif.type === 'trial_expiring') {
      navigate('/subscription')
    } else {
      navigate('/')
    }
  }

  const getIcon = (type) => {
    switch (type) {
      case 'new_order':
      case 'order':
      case 'order_status':
        return <ShoppingBag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      case 'low_stock':
      case 'stock':
        return <Package className="w-4 h-4 text-amber-600 dark:text-amber-400" />
      case 'admin_message':
      case 'payment_success':
      case 'payment_failed':
      case 'subscription_expired':
      case 'trial_expiring':
        return <CreditCard className="w-4 h-4 text-purple-600 dark:text-purple-400" />
      case 'new_customer':
        return <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      default:
        return <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
    }
  }

  const getTypeLabel = (type) => {
    switch (type) {
      case 'new_order':
        return 'Yangi Buyurtma'
      case 'order_status':
        return 'Buyurtma Holati'
      case 'low_stock':
        return 'Kam Qoldiq'
      case 'admin_message':
        return 'Admin Xabari / To\'lov'
      case 'payment_success':
        return 'To\'lov Tasdiqlandi'
      case 'payment_failed':
        return 'To\'lov Rad Etildi'
      case 'trial_expiring':
        return 'Sinov Muddati'
      case 'subscription_expired':
        return 'Obuna Muddati'
      case 'new_customer':
        return 'Yangi Mijoz'
      default:
        return 'Tizim Xabarnomasi'
    }
  }

  // Filter list
  const filteredNotifications = notifications.filter(n => {
    const isUnread = !n.read && !n.isRead
    if (filter === 'unread') return isUnread
    if (filter === 'orders') return ['new_order', 'order', 'order_status'].includes(n.type)
    if (filter === 'payments') return ['admin_message', 'payment_success', 'payment_failed', 'subscription_expired', 'trial_expiring'].includes(n.type)
    if (filter === 'stock') return ['low_stock', 'stock'].includes(n.type)
    return true
  })

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={toggleDropdown}
        aria-label="Bildirishnomalar"
        className={`relative p-2 rounded-xl transition ${
          isAdmin
            ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[360px] sm:w-[440px] max-w-[calc(100vw-24px)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 animate-scale-in">
          {/* Header */}
          <div className="p-4 bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                  {isAdmin ? 'Admin Bildirishnomalari' : 'Bildirishnomalar Markazi'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {unreadCount > 0 ? `${unreadCount} ta o'qilmagan xabar` : 'Barcha xabarlar o\'qilgan'}
                </p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                title="Barchasini o'qilgan deb belgilash"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Barchasi o'qildi
              </button>
            )}
          </div>

          {/* Filter Chips (Neat flex-wrap without cut-off or scrollbars) */}
          <div className="flex flex-wrap items-center gap-1.5 p-2.5 px-3 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold">
            {[
              { key: 'all', label: 'Barchasi' },
              { key: 'unread', label: `O'qilmagan (${unreadCount})` },
              { key: 'payments', label: isAdmin ? 'To\'lovlar' : 'Obuna / To\'lov' },
              { key: 'orders', label: 'Buyurtmalar' },
              { key: 'stock', label: 'Zaxira' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => {
                  sounds.playClick()
                  setFilter(tab.key)
                }}
                className={`px-2.5 py-1 rounded-lg transition ${
                  filter === tab.key
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notifications List (Smooth scrollbar-hide and overscroll containment) */}
          <div className="max-h-[380px] overflow-y-auto overscroll-contain scrollbar-hide divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Bell className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-xs font-semibold">Bildirishnomalar yo'q</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Ushbu toifada yangi xabarlar mavjud emas</p>
              </div>
            ) : (
              filteredNotifications.map((n) => {
                const isUnread = !n.read && !n.isRead
                return (
                  <div
                    key={n._id}
                    onClick={() => handleOpenDetail(n)}
                    className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer group ${
                      isUnread ? 'bg-emerald-50/50 dark:bg-emerald-950/25 border-l-4 border-emerald-500' : ''
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-xs shrink-0 mt-0.5">
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          {getTypeLabel(n.type)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {n.createdAt ? new Date(n.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 ${isUnread ? 'font-extrabold text-slate-900 dark:text-slate-100' : 'font-semibold text-slate-700 dark:text-slate-300'}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={(e) => handleDeleteNotif(n._id, e)}
                        className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition"
                        title="O'chirish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer Info */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 text-center text-[11px] text-slate-400 font-medium">
            Batafsil o'qish va amal bajarish uchun xabarnomani bosing
          </div>
        </div>
      )}

      {/* FULL NOTIFICATION DETAIL MODAL (To'liq O'qish Oynasi) */}
      {selectedNotif && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedNotif(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-start justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-inner">
                  {getIcon(selectedNotif.type)}
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full text-emerald-100">
                    {getTypeLabel(selectedNotif.type)}
                  </span>
                  <h3 className="font-extrabold text-base text-white mt-1 leading-snug">
                    {selectedNotif.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedNotif(null)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content with smooth contained scrolling */}
            <div className="p-6 space-y-4 overflow-y-auto overscroll-contain scrollbar-hide flex-1">
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {selectedNotif.createdAt ? new Date(selectedNotif.createdAt).toLocaleString('uz-UZ') : 'Hozir'}
                </span>
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> O'qildi
                </span>
              </div>

              {/* Full Text */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-sm leading-relaxed whitespace-pre-line">
                {selectedNotif.message}
              </div>

              {/* Structured Metadata (if available) */}
              {selectedNotif.data && Object.keys(selectedNotif.data).length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Qo'shimcha Ma'lumotlar:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(selectedNotif.data).map(([k, v]) => (
                      <div key={k} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block uppercase font-mono">{k}:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100 truncate block">
                          {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleDeleteNotif(selectedNotif._id)}
                  className="p-3 text-rose-600 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> O'chirish
                </button>

                <button
                  onClick={() => handleActionRedirect(selectedNotif)}
                  className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 font-bold"
                >
                  <ExternalLink className="w-4 h-4" /> Sahifaga o'tish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
