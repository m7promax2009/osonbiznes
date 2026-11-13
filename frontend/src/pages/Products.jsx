import React, { useState, useEffect, useRef } from 'react'
import { Plus, Search, Edit, Trash2, Package, X, Upload, Barcode, TrendingUp, AlertTriangle, CheckCircle2, Download, ImagePlus, Link } from 'lucide-react'
import api, { resolveImageUrl } from '../services/api'
import BarcodeModal from '../components/BarcodeModal'
import sounds from '../utils/audio'
import { useDebouncedValue } from '../hooks/useDebounce'
import { toast } from '../components/Toast'
import { exportToCSV } from '../utils/export'

export default function Products() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState(['Barchasi'])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('Barchasi')
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [selectedProductForBarcode, setSelectedProductForBarcode] = useState(null)
  const [formData, setFormData] = useState({ name: '', category: 'Boshqa', price: '', cost: '', stock: '', sku: '', description: '', images: [] })
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [imageUrlInput, setImageUrlInput] = useState('')
  const fileInputRef = useRef(null)
  const debouncedSearch = useDebouncedValue(search, 400)

  useEffect(() => {
    loadProducts()
  }, [debouncedSearch, categoryFilter])

  useEffect(() => {
    loadCategories()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const params = {}
      if (debouncedSearch) params.search = debouncedSearch
      if (categoryFilter !== 'Barchasi') params.category = categoryFilter
      const res = await api.getProducts(params)
      setProducts(res?.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const res = await api.getProductCategories()
      setCategories(['Barchasi', ...(res?.data || [])])
    } catch (_) {}
  }

  const openAddModal = () => {
    sounds.playClick()
    setError('')
    setEditingProduct(null)
    setFormData({ name: '', category: 'Kiyim', price: '', cost: '', stock: '', sku: '', description: '', images: [] })
    setImageUrlInput('')
    setShowModal(true)
  }

  const openEditModal = (product) => {
    sounds.playClick()
    setError('')
    setEditingProduct(product)
    const imgs = product.images?.length > 0 ? product.images : (product.image ? [product.image] : [])
    setFormData({
      name: product.name,
      category: product.category,
      price: String(product.price),
      cost: String(product.cost || ''),
      stock: String(product.stock),
      sku: product.sku || '',
      description: product.description || '',
      images: imgs,
    })
    setImageUrlInput('')
    setShowModal(true)
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploading(true)
      sounds.playClick()
      const data = await api.uploadImage(file)
      if (data?.url) {
        setFormData(prev => ({
          ...prev,
          images: [...(prev.images || []), data.url],
        }))
        toast.success('Rasm muvaffaqiyatli yuklandi')
      }
    } catch (err) {
      toast.error(err.message || 'Rasm yuklashda xatolik')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleAddImageUrl = () => {
    const url = imageUrlInput.trim()
    if (!url) return
    setFormData(prev => ({
      ...prev,
      images: [...(prev.images || []), url],
    }))
    setImageUrlInput('')
  }

  const handleRemoveImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }))
  }

  const handleExportCSV = () => {
    sounds.playClick()
    const headers = {
      name: 'Mahsulot Nomi',
      category: 'Kategoriya',
      price: 'Sotish Narxi (so\'m)',
      cost: 'Tannarxi (so\'m)',
      stock: 'Qoldiq (dona)',
      sku: 'SKU / Kod',
      status: 'Holati',
    }
    const rows = products.map(p => ({
      name: p.name,
      category: p.category,
      price: p.price,
      cost: p.cost || 0,
      stock: p.stock,
      sku: p.sku || '',
      status: p.status === 'out' ? 'Tugagan' : p.stock < 5 ? 'Kam qoldi' : 'Mavjud',
    }))
    exportToCSV('Mahsulotlar_Ombor', headers, rows)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const payload = {
      ...formData,
      price: Number(formData.price),
      cost: Number(formData.cost),
      stock: Number(formData.stock),
    }
    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct._id, payload)
        toast.success(`"${formData.name}" yangilandi`)
      } else {
        await api.createProduct(payload)
        toast.success(`"${formData.name}" qo'shildi`)
      }
      sounds.playSuccess()
      setShowModal(false)
      loadProducts()
    } catch (err) {
      setError(err.message)
    }
  }

  const deleteProduct = async (id, name) => {
    sounds.playClick()
    if (confirm(`Rostdan ham "${name}" ni oʻchirmoqchimisiz?`)) {
      try {
        await api.deleteProduct(id)
        toast.success(`"${name}" o'chirildi`)
        loadProducts()
      } catch (err) {
        toast.error(err.message)
      }
    }
  }

  const formatPrice = (p) => new Intl.NumberFormat('ru-RU').format(p || 0) + " so'm"

  const calcMargin = (price, cost) => {
    if (!price || !cost || price <= 0) return 0
    return Math.round(((price - cost) / price) * 100)
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Barcode Tag Modal */}
      <BarcodeModal
        product={selectedProductForBarcode}
        onClose={() => setSelectedProductForBarcode(null)}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Mahsulotlar & Ombor
            <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full font-mono font-bold border border-emerald-500/20">
              {products.length} ta mahsulot
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Zaxira boshqaruvi, marja hisob-kitobi va shtrix-kodlar chop etish
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="btn-secondary flex items-center gap-1.5 text-xs font-bold py-2.5 px-3.5"
            title="Excel formatida yuklab olish"
          >
            <Download className="w-4 h-4 text-emerald-600" /> Excel / CSV Eksport
          </button>
          <button onClick={openAddModal} className="btn-primary">
            <Plus className="w-4 h-4" /> Yangi Mahsulot Qoʻshish
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Search & Categories Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Mahsulot nomi yoki SKU boʻyicha qidirish..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide py-0.5">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => {
                sounds.playClick()
                setCategoryFilter(cat)
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                categoryFilter === cat
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table Card */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Mahsulot Nomi</th>
                <th className="px-6 py-4">Kategoriya</th>
                <th className="px-6 py-4">Sotish Narxi</th>
                <th className="px-6 py-4">Foyda Marjasi</th>
                <th className="px-6 py-4">Ombor Qoldigʻi</th>
                <th className="px-6 py-4 text-right">Amallar & Tag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {products.map(product => {
                const margin = calcMargin(product.price, product.cost)
                return (
                  <tr key={product._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200/60 dark:border-slate-700/60">
                          {(product.images?.[0] || product.image) ? (
                            <img src={resolveImageUrl(product.images?.[0] || product.image)} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{product.name}</p>
                          <p className="text-xs text-slate-400 font-mono">{product.sku || 'SKU-001'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {product.category}
                    </td>
                    <td className="px-6 py-4 font-extrabold text-emerald-600 dark:text-emerald-400">
                      {formatPrice(product.price)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                        <TrendingUp className="w-3 h-3" /> {margin}% marja
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        product.stock <= 3
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}>
                        {product.stock <= 3 && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                        {product.stock} dona qoldi
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            sounds.playClick()
                            setSelectedProductForBarcode(product)
                          }}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-600 dark:text-emerald-400 rounded-xl transition"
                          title="Shtrix-kod Tag chop etish"
                        >
                          <Barcode className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-xl transition"
                          title="Tahrirlash"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteProduct(product._id, product.name)}
                          className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl transition"
                          title="O'chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center">
                    <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" aria-hidden="true" />
                    <p className="text-sm text-slate-400">Hozircha mahsulotlar yo'q. "Yangi Mahsulot Qoʻshish" tugmasi orqali qo'shing.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
                {editingProduct ? 'Mahsulotni Tahrirlash' : 'Yangi Mahsulot Qoʻshish'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Mahsulot Nomi</label>
                <input required className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Masalan: Erkaklar Futbolkasi" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Kategoriya</label>
                  <input className="input-field" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="Kiyim, Elektronika..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">SKU / Shtrix-kod</label>
                  <input className="input-field" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} placeholder="87193001" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Sotish Narxi (so'm)</label>
                  <input required type="number" className="input-field" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="140000" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Tannarxi (so'm)</label>
                  <input type="number" className="input-field" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} placeholder="85000" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Ombor Qoldigʻi (dona)</label>
                <input required type="number" className="input-field" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} placeholder="25" />
              </div>

              {/* Photos & Images Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Mahsulot Rasmlari
                </label>

                {/* Image Previews */}
                {formData.images?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    {formData.images.map((imgUrl, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 group shrink-0">
                        <img src={resolveImageUrl(imgUrl)} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-0.5 right-0.5 p-0.5 bg-rose-600 text-white rounded-full opacity-80 hover:opacity-100 transition shadow"
                          title="Rasmni o'chirish"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3"
                  >
                    {uploading ? (
                      <><div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /> Yuklanmoqda...</>
                    ) : (
                      <><Upload className="w-3.5 h-3.5 text-emerald-600" /> Fayldan Yuklash</>
                    )}
                  </button>

                  <div className="flex-1 flex gap-1.5">
                    <input
                      type="url"
                      value={imageUrlInput}
                      onChange={e => setImageUrlInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddImageUrl())}
                      placeholder="yoki rasm URL manzilini kiriting..."
                      className="input-field text-xs flex-1"
                    />
                    {imageUrlInput && (
                      <button
                        type="button"
                        onClick={handleAddImageUrl}
                        className="btn-primary text-xs py-1.5 px-3"
                      >
                        Qo'shish
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Tavsif (Ixtiyoriy)</label>
                <textarea
                  className="input-field text-xs resize-none"
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Mahsulot haqida qisqacha ma'lumot..."
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Bekor qilish</button>
                <button type="submit" className="btn-primary flex-1 font-bold">
                  {editingProduct ? 'Saqlash' : 'Qoʻshish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
