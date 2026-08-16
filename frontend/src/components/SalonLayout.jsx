import React, { useState, useEffect } from 'react'
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom'
import { LogOut, Moon, Sun, Wifi, WifiOff, ExternalLink, Scissors, UserCheck, Smartphone, Sparkles, Bell } from 'lucide-react'
import Logo from './Logo'

export default function SalonLayout({ user, onLogout }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isBarber = user?.role === 'master'
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const logout = () => {
    onLogout()
    navigate('/login')
  }

  // Tezkor demo rollarni almashtirish (Hakamlarga barcha rollarni 1 soniyada ko'rsatish uchun)
  const switchDemoRole = (role) => {
    if (role === 'owner') {
      const ownerUser = {
        id: '66bc11111111111111111111',
        _id: '66bc11111111111111111111',
        name: 'Zamon Barbershop egasi',
        email: 'barber@salon.uz',
        role: 'shop_owner',
        business: 'Zamon Barbershop',
        phone: '+998 90 111 22 33',
      }
      localStorage.setItem('user', JSON.stringify(ownerUser))
      window.location.href = '/'
    } else if (role === 'master') {
      const masterUser = {
        id: '66bc22222222222222222221',
        _id: '66bc22222222222222222221',
        name: 'Jasur Usta',
        email: 'jasur@salon.uz',
        role: 'master',
        specialty: 'Fade',
        avatar: '💈',
        business: 'Zamon Barbershop',
      }
      localStorage.setItem('user', JSON.stringify(masterUser))
      window.location.href = '/'
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <Scissors className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white truncate">
                    {user?.business || 'Zamon Barbershop'}
                  </p>
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                    isBarber
                      ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                      : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                  }`}>
                    {isBarber ? '💈 Sartarosh' : '👑 Salon Egasi'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {user?.name} · Mahalladagi Sartaroshxona CRM
                </p>
              </div>
            </Link>
          </div>

          {/* Quick Demo Switcher & Controls */}
          <div className="flex items-center gap-2">
            {/* Quick Demo Role Switch Buttons */}
            <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs font-semibold">
              <span className="pl-1.5 pr-0.5 text-[9px] uppercase tracking-wider text-slate-400 font-bold">Xodim</span>
              <button
                onClick={() => switchDemoRole('owner')}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                  !isBarber
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="Salon egasi ko'rinishi"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Egasi</span>
              </button>
              <button
                onClick={() => switchDemoRole('master')}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                  isBarber
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="Sartarosh (Usta) ko'rinishi"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Usta</span>
              </button>
              <span className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-0.5" />
              <span className="px-0.5 text-[9px] uppercase tracking-wider text-slate-400 font-bold">Mijoz</span>
              <Link
                to="/salon"
                target="_blank"
                className="px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                title="Mijoz band qilish sahifasi (yangi oyna)"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mijoz</span>
              </Link>
              <Link
                to="/navbatim"
                target="_blank"
                className="px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition"
                title="Mening navbatim sahifasi"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Navbatim</span>
              </Link>
            </div>

            {/* Network Indicator */}
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
                online
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40 animate-pulse'
              }`}
              title={online ? 'Server bilan aloqa alo' : 'Oflayn rejim — ma\'lumotlar lokal saqlanadi'}
            >
              {online ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{online ? 'Onlayn' : 'Oflayn'}</span>
            </div>

            {/* Dark Mode Switcher */}
            <button
              onClick={() => setDark(!dark)}
              aria-label="Rang rejimini o'zgartirish"
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              {dark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* Logout */}
            <button
              onClick={logout}
              aria-label="Chiqish"
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
              title="Tizimdan chiqish"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
