import React, { useState, useEffect, Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import './i18n'
import SalonLayout from './components/SalonLayout'
import AdminLayout from './components/AdminLayout'
import Login from './pages/Login'
import { Toaster } from './components/Toast'

// Sartaroshxona (Barbero) — asosiy oqim
const BarberMarket = lazy(() => import('./pages/BarberMarket'))
const MyQueue = lazy(() => import('./pages/MyQueue'))
const SalonToday = lazy(() => import('./pages/SalonToday'))
const BarberQueue = lazy(() => import('./pages/BarberQueue'))
// Admin
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminSubscriptions = lazy(() => import('./pages/admin/AdminSubscriptions'))
const AdminPayments = lazy(() => import('./pages/admin/AdminPayments'))

function PageLoader() {
  return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') document.documentElement.classList.add('dark')
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (token && savedUser) {
      try { setUser(JSON.parse(savedUser)) } catch { localStorage.removeItem('token'); localStorage.removeItem('user') }
    }
    setLoading(false)
  }, [])

  const handleLogin = (u) => { setUser(u); localStorage.setItem('user', JSON.stringify(u)) }
  const handleLogout = () => { setUser(null); localStorage.removeItem('token'); localStorage.removeItem('user') }
  const homeFor = (u) => (u?.role === 'admin' ? '/admin' : '/')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4"><div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /><p className="text-slate-500 text-sm">Yuklanmoqda...</p></div>
      </div>
    )
  }

  return (
    <>
      <Toaster />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to={homeFor(user)} replace /> : <Login onLogin={handleLogin} />} />

          {/* Public — mijoz */}
          <Route path="/salon" element={<BarberMarket />} />
          <Route path="/navbatim" element={<MyQueue />} />

          {/* Ega / Sartarosh */}
          <Route
            path="/"
            element={
              !user ? <Navigate to="/salon" replace />
                : user.role === 'admin' ? <Navigate to="/admin" replace />
                  : <SalonLayout user={user} onLogout={handleLogout} />
            }
          >
            {user?.role === 'master'
              ? <Route index element={<BarberQueue user={user} />} />
              : <Route index element={<SalonToday />} />}
          </Route>

          {/* Admin */}
          <Route
            path="/admin"
            element={user && user.role === 'admin' ? <AdminLayout user={user} onLogout={handleLogout} /> : user ? <Navigate to="/" replace /> : <Navigate to="/login" replace />}
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="subscriptions" element={<AdminSubscriptions />} />
            <Route path="payments" element={<AdminPayments />} />
          </Route>

          <Route path="*" element={<Navigate to={user ? homeFor(user) : '/salon'} replace />} />
        </Routes>
      </Suspense>
    </>
  )
}
