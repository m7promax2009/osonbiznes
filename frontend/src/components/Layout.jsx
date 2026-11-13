import React, { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  FileText,
  Bot,
  CreditCard,
  Menu,
  LogOut,
  ChevronDown,
  Store,
  Bell,
  Settings,
} from 'lucide-react'
import Logo from './Logo'
import LanguageSwitcher from './LanguageSwitcher'
import NotificationsDropdown from './NotificationsDropdown'
import AIAdvisor from './AIAdvisor'
import EmailVerifyBanner from './EmailVerifyBanner'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', key: 'dashboard', end: true },
  { to: '/pos', icon: CreditCard, label: 'Sotuv (POS)', key: 'pos' },
  { to: '/products', icon: Package, label: 'Mahsulotlar', key: 'products' },
  { to: '/orders', icon: ShoppingCart, label: 'Buyurtmalar', key: 'orders' },
  { to: '/customers', icon: Users, label: 'Mijozlar', key: 'customers' },
  { to: '/invoices', icon: FileText, label: 'Hisob-fakturalar', key: 'invoices' },
  { to: '/telegram', icon: Bot, label: 'Telegram Bot', key: 'telegram' },
  { to: '/subscription', icon: CreditCard, label: 'Obuna', key: 'subscription' },
  { to: '/marketplace-settings', icon: Settings, label: 'OsonBozor sozlamalari', key: 'marketplace_settings' },
]

export default function Layout({ user, onLogout }) {
  const { t } = useTranslation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const location = useLocation()

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 
        transform transition-transform duration-300 ease-in-out flex flex-col
        lg:translate-x-0 lg:static lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100 shrink-0">
          <Logo size={36} />
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
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
                  transition-all duration-150 group relative
                  ${isActive 
                    ? 'bg-emerald-50 text-emerald-700 font-semibold' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                  }
                `}
              >
                <Icon className={`w-5 h-5 transition-colors ${
                  isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'
                }`} />
                <span>{t(`nav.${item.key}`, item.label)}</span>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-500 rounded-r-full" />
                )}
              </NavLink>
            )
          })}

          <div className="my-3 border-t border-slate-100" />

          {/* OsonBozor Public Link */}
          <a
            href="/marketplace"
            target="_blank"
            rel="noopener noreferrer"
            title="OsonBozor marketplace vitrinasi"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-emerald-600 hover:bg-emerald-50 transition-all"
          >
            <Store className="w-5 h-5 text-emerald-600" />
            <span>OsonBozor vitrinasi</span>
            <svg className="w-3.5 h-3.5 ml-auto opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </nav>

        {/* User info at bottom */}
        <div className="p-4 border-t border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm shrink-0">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{user?.business || user?.name || 'Foydalanuvchi'}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email || ''}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition"
              aria-label="Menyuni ochish"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            
            {/* Breadcrumb */}
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="text-slate-400">OsonBiznes</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-700 font-medium">
                {t(`nav.${navItems.find(i => i.end ? location.pathname === i.to : location.pathname.startsWith(i.to))?.key}`, 'Dashboard')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Notifications Dropdown */}
            <NotificationsDropdown />

            {/* Language Switcher */}
            <LanguageSwitcher dropdown />

            {/* User menu */}
            <div className="relative">
              <button 
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                  {user?.name?.[0] || 'U'}
                </div>
                <span className="hidden md:inline text-sm font-medium text-slate-700 max-w-[120px] truncate">
                  {user?.name || 'Foydalanuvchi'}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-fade-in">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-sm font-medium text-slate-800">{user?.name}</p>
                      <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                      {user?.business && (
                        <p className="text-[11px] text-emerald-600 font-medium mt-0.5 truncate">🏪 {user.business}</p>
                      )}
                    </div>
                    <NavLink
                      to="/subscription"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                    >
                      <CreditCard className="w-4 h-4 text-slate-400" />
                      {t('nav.subscription', 'Obuna')}
                    </NavLink>
                    <NavLink
                      to="/marketplace-settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      {t('nav.marketplace_settings', 'OsonBozor sozlamalari')}
                    </NavLink>
                    <div className="my-1 border-t border-slate-100" />
                    <button 
                      onClick={() => { onLogout(); setUserMenuOpen(false) }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      Chiqish
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <EmailVerifyBanner user={user} />
          <Outlet />
        </main>
      </div>

      {/* Smart AI Business Advisor Floating Assistant */}
      {/* POS'da suzuvchi tugma "To'lovni yakunlash" ni to'sadi */}
      {!location.pathname.startsWith('/pos') && <AIAdvisor />}
    </div>
  )
}
