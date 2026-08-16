import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, ArrowRight, UserPlus, MessageSquare, ScanFace } from 'lucide-react'
import api from '../services/api'
import LanguageSwitcher from '../components/LanguageSwitcher'
import SupportModal from '../components/SupportModal'
import Logo from '../components/Logo'
import FaceIdModal from '../components/FaceIdModal'

export default function Login({ onLogin }) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showRegister, setShowRegister] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('register') === '1'
    }
    return false
  })
  const [regForm, setRegForm] = useState({ name: '', email: '', password: '', business: '', phone: '' })
  const [regLoading, setRegLoading] = useState(false)
  const [showSupport, setShowSupport] = useState(false)
  const [showFaceId, setShowFaceId] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError(t('login.error_required')); return }
    setLoading(true)
    try {
      const data = await api.login(email, password)
      onLogin(data.user)
    } catch (err) {
      setError(err.message || t('login.error_invalid'))
    } finally { setLoading(false) }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    if (!regForm.name || !regForm.email || !regForm.password) { setError(t('register.error_required')); return }
    if (regForm.password.length < 6) { setError(t('register.error_password')); return }
    setRegLoading(true)
    try {
      const data = await api.register(regForm)
      onLogin(data.user)
    } catch (err) {
      setError(err.message || t('register.error_required'))
    } finally { setRegLoading(false) }
  }

  if (showRegister) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-50 to-emerald-50">
        {/* Language switcher positioned top-right */}
        <div className="fixed top-4 right-4 z-50">
          <LanguageSwitcher dropdown />
        </div>

        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4"><Logo size={44} /></div>
            <h1 className="text-2xl font-bold text-slate-900">{t('register.title')}</h1>
            <p className="text-slate-500 text-sm mt-1">{t('register.subtitle')}</p>
          </div>
          {error && (<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>)}
          <form onSubmit={handleRegister} className="space-y-3.5">
            <input required className="input-field" value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})} placeholder={t('register.name')} />
            <input required type="email" className="input-field" value={regForm.email} onChange={e => setRegForm({...regForm, email: e.target.value})} placeholder={t('register.email')} />
            <input required type="password" className="input-field" value={regForm.password} onChange={e => setRegForm({...regForm, password: e.target.value})} placeholder={t('register.password')} />
            <div className="grid grid-cols-2 gap-3">
              <input className="input-field" value={regForm.business} onChange={e => setRegForm({...regForm, business: e.target.value})} placeholder={t('register.business')} />
              <input className="input-field" value={regForm.phone} onChange={e => setRegForm({...regForm, phone: e.target.value})} placeholder={t('register.phone')} />
            </div>
            <button type="submit" disabled={regLoading} className="btn-primary w-full py-3 text-base">
              {regLoading ? (
                <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {t('register.registering')}</span>
              ) : (
                <span className="flex items-center gap-2"><UserPlus className="w-4 h-4" /> {t('register.start_free')}</span>
              )}
            </button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-6">
            {t('register.have_account')} <button onClick={() => { setShowRegister(false); setError('') }} className="text-emerald-600 hover:text-emerald-700 font-medium">{t('register.login')}</button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen flex">
        {/* Language switcher */}
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          <button
            onClick={() => setShowSupport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 shadow-sm border border-slate-200 text-xs text-slate-600 hover:text-amber-600 hover:border-amber-300 transition"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('login.contact_admin')}</span>
          </button>
          <div className="bg-white/90 rounded-lg shadow-sm border border-slate-200 px-1.5 py-1 backdrop-blur-sm">
            <LanguageSwitcher />
          </div>
        </div>

        {/* Left side - Login Form */}
        <div className="flex-1 flex items-center justify-center px-6 lg:px-12 bg-white">
          <div className="w-full max-w-md">
            <div className="mb-8"><Logo size={44} /></div>

            <h1 className="text-2xl font-bold text-slate-900 mb-1">Xush kelibsiz 👋</h1>
            <p className="text-slate-500 mb-8 text-sm">Salon yoki sartarosh sifatida tizimga kiring</p>

            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('login.email')}</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" placeholder="siz@email.com" autoComplete="email" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-slate-700">{t('login.password')}</label>
                  <button type="button" className="text-xs text-slate-500 hover:text-emerald-600 transition">{t('login.forgot_password')}</button>
                </div>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="input-field pr-10" placeholder="••••••••" autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? t('login.hide_password') : t('login.show_password')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300 transition-all">
                {loading ? (
                  <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {t('login.logging_in')}</span>
                ) : (
                  <span className="flex items-center gap-2">{t('login.login')} <ArrowRight className="w-4 h-4" /></span>
                )}
              </button>
            </form>

            <button type="button" onClick={() => setShowFaceId(true)} className="mt-4 w-full py-3 rounded-xl border-2 border-indigo-200 text-indigo-700 font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-50 transition">
              <ScanFace className="w-5 h-5" /> Face ID bilan kirish
            </button>

            <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
              <p className="text-xs text-slate-500 text-center">Demo bilan tez kirish</p>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => { setEmail('barber@salon.uz'); setPassword('barber123') }} className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-xs font-medium text-slate-600 hover:text-indigo-700">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-[10px]">E</span>
                  Salon egasi
                </button>
                <button type="button" onClick={() => { setEmail('jasur@salon.uz'); setPassword('jasur123') }} className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-xs font-medium text-slate-600 hover:text-blue-700">
                  <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-[10px]">💈</span>
                  Sartarosh
                </button>
              </div>
              <a href="/salon" className="block text-center text-xs font-semibold text-indigo-600 hover:text-indigo-700 pt-1">
                ✂️ Mijozmisiz? Sartarosh tanlab, navbatga yoziling →
              </a>
            </div>

            <p className="text-center text-sm text-slate-500 mt-6">
              Salomingiz bormi? <button onClick={() => setShowRegister(true)} className="text-indigo-600 hover:text-indigo-700 font-medium">Ro'yxatdan o'tish</button>
            </p>
          </div>
        </div>

        {/* Right side - Gradient with Banner */}
        <div className="hidden lg:flex flex-1 bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 items-center justify-center p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/images/banner.png')] bg-cover bg-center opacity-20" />
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-white/5 rounded-full" />

          <div className="relative text-center max-w-lg">
            <div className="text-6xl mb-4">✂️</div>
            <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
              30 daqiqa kutish yo'q,<br />
              <span className="text-indigo-200">onlayn navbat</span>
            </h2>
            <p className="text-indigo-100/80 text-lg mb-8 leading-relaxed">
              Sartaroshni skill va reyting bo'yicha tanlang, navbatga yoziling.<br />
              Zalog tizimi bilan "kelmadi" muammosi hal.
            </p>
            <div className="grid grid-cols-3 gap-4">
            {[
              { value: 'Ega', label: 'Bugun nima bor' },
              { value: 'Sartarosh', label: 'Mening navbatim' },
              { value: 'Mijoz', label: 'Online band qilish' },
            ].map((stat, i) => (
              <div key={i} className="p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                <p className="text-lg font-bold text-white">{stat.value}</p>
                <p className="text-xs text-indigo-200/80 mt-1">{stat.label}</p>
              </div>
            ))}
            </div>
          </div>
        </div>
      </div>

      <SupportModal isOpen={showSupport} onClose={() => setShowSupport(false)} />
      {showFaceId && <FaceIdModal onClose={() => setShowFaceId(false)} onLogin={onLogin} />}
    </>
  )
}
