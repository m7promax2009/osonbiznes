import React, { useState, useEffect, Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import './i18n'
import Layout from './components/Layout'
import AdminLayout from './components/AdminLayout'
import Login from './pages/Login'
import { Toaster } from './components/Toast'

// Lazy-load page components for code splitting (smaller initial bundle)
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Products = lazy(() => import('./pages/Products'))
const Orders = lazy(() => import('./pages/Orders'))
const Customers = lazy(() => import('./pages/Customers'))
const Invoices = lazy(() => import('./pages/Invoices'))
const TelegramBot = lazy(() => import('./pages/TelegramBot'))
const POS = lazy(() => import('./pages/POS'))
const Subscription = lazy(() => import('./pages/Subscription'))
const OsonBozor = lazy(() => import('./pages/OsonBozor'))
const OsonBozorShop = lazy(() => import('./pages/OsonBozorShop'))
const MarketplaceSettings = lazy(() => import('./pages/MarketplaceSettings'))
// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminSubscriptions = lazy(() => import('./pages/admin/AdminSubscriptions'))
const AdminPayments = lazy(() => import('./pages/admin/AdminPayments'))

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (token && savedUser) {
      try {
        const parsed = JSON.parse(savedUser)
        setUser(parsed)
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  // Login'dan keyin qayerga qaytish (masalan: /marketplace)
  const getPostLoginPath = (u) => {
    try {
      const params = new URLSearchParams(window.location.search)
      const redirect = params.get('redirect')
      if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
        return redirect
      }
    } catch (_) {}
    return u?.role === 'admin' ? '/admin' : '/'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">OsonBiznes yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Toaster />
      <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to={getPostLoginPath(user)} replace /> : <Login onLogin={handleLogin} />}
        />

        {/* Shop Owner routes */}
        <Route
          path="/"
          element={user ? <Layout user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />}
        >
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="orders" element={<Orders />} />
          <Route path="customers" element={<Customers />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="telegram" element={<TelegramBot />} />
          <Route path="pos" element={<POS />} />
          <Route path="subscription" element={<Subscription />} />
          <Route path="marketplace-settings" element={<MarketplaceSettings />} />
        </Route>

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            user && user.role === 'admin' ? (
              <AdminLayout user={user} onLogout={handleLogout} />
            ) : user ? (
              <Navigate to="/" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="subscriptions" element={<AdminSubscriptions />} />
          <Route path="payments" element={<AdminPayments />} />
        </Route>

        {/* Public Marketplace routes - OsonBozor */}
        <Route path="/marketplace" element={<OsonBozor />} />
        <Route path="/marketplace/shop/:shopId" element={<OsonBozorShop />} />

        <Route path="*" element={<Navigate to={user ? (user.role === 'admin' ? '/admin' : '/') : '/login'} replace />} />
      </Routes>
      </Suspense>
    </>
  )
}
