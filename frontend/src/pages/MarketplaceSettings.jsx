import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { MapPin, Save, ExternalLink, Globe, CheckCircle2, AlertCircle } from 'lucide-react'
import api from '../services/api'

export default function MarketplaceSettings() {
  const { t } = useTranslation()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    showOnMarketplace: false,
    description: '',
    city: '',
    address: '',
    latitude: '',
    longitude: '',
    categories: [],
    botUsername: '',
  })
  const [categoryInput, setCategoryInput] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const data = await api.getMarketplaceProfile()
      setProfile(data)
      setForm({
        showOnMarketplace: data.showOnMarketplace || false,
        description: data.description || '',
        city: data.city || '',
        address: data.address || '',
        latitude: data.latitude || '',
        longitude: data.longitude || '',
        categories: data.categories || [],
        botUsername: data.botUsername || '',
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      await api.updateMarketplaceProfile(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const addCategory = () => {
    const cat = categoryInput.trim()
    if (cat && !form.categories.includes(cat)) {
      setForm({ ...form, categories: [...form.categories, cat] })
    }
    setCategoryInput('')
  }

  const removeCategory = (cat) => {
    setForm({ ...form, categories: form.categories.filter(c => c !== cat) })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">OsonBozor sozlamalari</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Do'koningizni OsonBozor marketplace'da butun O'zbekistonga ko'rsating
          </p>
        </div>
        <a
          href="/marketplace"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100 transition"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          OsonBozorni ko'rish
        </a>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {saved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {t('marketplace.saved')}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
        {/* Toggle */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
          <div className="flex items-start gap-3">
            <Globe className="w-5 h-5 text-emerald-600 mt-0.5" />
            <div>
              <p className="font-medium text-slate-800 text-sm">{t('marketplace.show_on_marketplace')}</p>
              <p className="text-xs text-slate-500 mt-0.5">{t('marketplace.show_on_marketplace_desc')}</p>
              {form.showOnMarketplace && (
                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Do'koningiz OsonBozorda ko'rinadi
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setForm({ ...form, showOnMarketplace: !form.showOnMarketplace })}
            role="switch"
            aria-checked={form.showOnMarketplace}
            aria-label={t('marketplace.show_on_marketplace')}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              form.showOnMarketplace ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
              form.showOnMarketplace ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('marketplace.shop_description')}</label>
          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="input-field resize-none"
            placeholder="Do'koningiz haqida qisqacha ma'lumot..."
          />
        </div>

        {/* City & Address */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('marketplace.shop_city')}</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
              <input
                type="text"
                value={form.city}
                onChange={e => setForm({ ...form, city: e.target.value })}
                className="input-field pl-10"
                placeholder="Toshkent, Samarqand..."
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('marketplace.shop_address')}</label>
            <input
              type="text"
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              className="input-field"
              placeholder="Chilonzor tumani, 12-uy"
            />
          </div>
        </div>

        {/* Location (map) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Xaritada joylashuv</label>
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
              <input
                type="number"
                step="any"
                value={form.latitude}
                onChange={e => setForm({ ...form, latitude: e.target.value })}
                className="input-field pl-10"
                placeholder="Kenglik (lat), mas: 41.3111"
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
              <input
                type="number"
                step="any"
                value={form.longitude}
                onChange={e => setForm({ ...form, longitude: e.target.value })}
                className="input-field pl-10"
                placeholder="Uzunlik (lng), mas: 69.2406"
              />
            </div>
          </div>
          {/* Map preview */}
          {form.latitude && form.longitude ? (
            <div className="rounded-xl overflow-hidden border border-slate-200">
              <iframe
                title="Do'kon xaritada"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(form.longitude) - 0.02}%2C${Number(form.latitude) - 0.015}%2C${Number(form.longitude) + 0.02}%2C${Number(form.latitude) + 0.015}&layer=mapnik&marker=${form.latitude}%2C${form.longitude}`}
                className="w-full h-48"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center">
              <MapPin className="w-5 h-5 mx-auto text-slate-400 mb-1" aria-hidden="true" />
              <p className="text-xs text-slate-500">Koordinatalarni kiriting — OsonBozor'da "Do'konlar xaritasi" bo'limida do'koningiz ko'rsatiladi. Masalan: Toshkent (41.3111, 69.2406)</p>
            </div>
          )}
        </div>

        {/* Categories */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Kategoriyalar</label>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {form.categories.map(cat => (
              <span key={cat} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full">
                {cat}
                <button type="button" onClick={() => removeCategory(cat)} aria-label={`${cat} - ochirish`} className="hover:text-red-600">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={categoryInput}
              onChange={e => setCategoryInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCategory())}
              className="input-field flex-1"
              placeholder="Smartfonlar, Aksessuarlar..."
            />
            <button type="button" onClick={addCategory} className="btn-secondary text-sm">+</button>
          </div>
        </div>

        {/* Bot Username */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Telegram bot username</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" aria-hidden="true">@</span>
            <input
              type="text"
              value={form.botUsername.replace('@', '')}
              onChange={e => setForm({ ...form, botUsername: e.target.value.replace('@', '') })}
              className="input-field pl-8"
              placeholder="OSSON_BIZNES_BOT"
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">Mijozlar Telegram bot orqali buyurtma beradi</p>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
          {saving ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saqlanmoqda...</>
          ) : (
            <><Save className="w-4 h-4" /> {t('marketplace.save_settings')}</>
          )}
        </button>
      </form>
    </div>
  )
}
