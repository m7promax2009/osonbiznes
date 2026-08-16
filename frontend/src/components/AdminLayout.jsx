import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import Logo from './Logo'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  DollarSign,
  Store,
  Menu,
  LogOut,
  ChevronDown,
  Bell,
  CheckCheck,
  ShoppingBag,
  AlertCircle,
  CheckCircle2,
  Timer,
} from 'lucide-react'
import api from '../services/api'
import LanguageSwitcher from './LanguageSwitcher'

const navItems = [
  { to: '/admin', icon: LayoutDashboard, key: 'dashboard', end: true },
  { to: '/admin/users', icon: Users, key: 'admin_users' },
  { to: '/admin/subscriptions', icon: CreditCard, key: 'admin_subscriptions' },
  { to: '/admin/payments', icon: DollarSign, key: 'admin_payments' },
]

const notifColors = {
  new_order: 'text-blue-700 bg-blue-100',
  payment_success: 'text-emerald-700 bg-emerald-100',
  subscription_expired: 'text-red-700 bg-red-100',
  system: 'text-slate-600 bg-slate-100',
}

export default function AdminLayout({ user, onLogout }) {
  const { t } = useTranslation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const location = useLocation()

  const loadNotifications = useCallback(async () => {
    try {
      const res = await api.getNotifications({ limit: 5 })
      if (res && res.data) {
        setNotifications(res.data)
        setUnreadCount(res.unreadCount || 0)
      }
    } catch (_) {}
  }, [])

  const loadUnreadCount = useCallback(async () => {
    try {
      const data = await api.getUnreadCount()
      if (data) setUnreadCount(data.count || 0)
    } catch (_) {}
  }, [])

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [loadNotifications, loadUnreadCount])

  useEffect(() => {
    if (notifOpen) loadNotifications()
  }, [notifOpen, loadNotifications])

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead()
      setUnreadCount(0)
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch (_) {}
  }

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={closeSidebar} />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 border-r border-slate-800
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
          <Logo size={34} light />
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to)

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={closeSidebar}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-150 group
                  ${isActive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                <span>{t(`nav.${item.key}`)}</span>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-500 rounded-r-full" />
                )}
              </NavLink>
            )
          })}

          <div className="my-4 border-t border-slate-800" />

          <a
            href="/salon"
            target="_blank"
            rel="noopener noreferrer"
            title="Salon vitrinasini mijoz ko'zi bilan ko'rish (yangi oynada)"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-all"
          >
            <Store className="w-5 h-5" />
            <span>Salon vitrinasi</span>
            <svg className="w-3 h-3 ml-auto opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800 bg-slate-900">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
              {user?.name?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{user?.name || 'Admin'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email || 'admin@osonbiznes.uz'}</p>
            </div>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">Admin</span>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Menyuni ochish"
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition"
            >
              <Menu className="w-5 h-5 text-slate-600" aria-hidden="true" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="text-slate-500">Admin</span>
              <span className="text-slate-500">/</span>
              <span className="text-slate-700 font-medium">
                {t(`nav.${navItems.find(i => i.end ? location.pathname === i.to : location.pathname.startsWith(i.to))?.key}`) || t('nav.dashboard')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <LanguageSwitcher dropdown />

            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                aria-label={t('notifications.title')}
                aria-expanded={notifOpen}
                className="relative p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-emerald-600' : 'text-slate-500'}`} aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold animate-pulse-dot">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 z-20 animate-fade-in">
                    <div className="flex items-center justify-between p-3 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-800">{t('notifications.title')}</h3>
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllRead} className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                          <CheckCheck className="w-3 h-3" /> {t('notifications.mark_all_read')}
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500">
                          <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
                          {t('notifications.empty')}
                        </div>
                      ) : (
                        notifications.map((notif, idx) => {
                          const colorClass = notifColors[notif.type] || 'text-slate-600 bg-slate-100'
                          return (
                            <div
                              key={notif._id || idx}
                              className={`flex items-start gap-3 p-3 hover:bg-slate-50 transition cursor-pointer border-b border-slate-50 last:border-0 ${!notif.read ? 'bg-emerald-50/40' : ''}`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                                <Bell className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${notif.read ? 'text-slate-600' : 'text-slate-800 font-medium'}`}>
                                  {notif.title}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5 truncate">{notif.message}</p>
                                <p className="text-[10px] text-slate-300 mt-1">
                                  {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString('uz-UZ') : ''}
                                </p>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-label={user?.name || 'Admin'}
                aria-expanded={userMenuOpen}
                className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm" aria-hidden="true">
                  {user?.name?.[0] || 'A'}
                </div>
                <ChevronDown className="w-4 h-4 text-slate-500" aria-hidden="true" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-20 animate-fade-in">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-sm font-medium text-slate-800">{user?.name || 'Admin'}</p>
                      <p className="text-xs text-slate-500">{user?.email || 'admin@osonbiznes.uz'}</p>
                    </div>
                    <button
                      onClick={() => { onLogout(); setUserMenuOpen(false) }}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      {t('user_menu.logout')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
