import React, { useState, useEffect } from 'react'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Smartphone,
  Check,
  DollarSign,
  Barcode,
  Printer,
  UserCheck,
  Zap,
  Sparkles,
  X,
  Camera,
} from 'lucide-react'
import api from '../services/api'
import ThermalReceiptModal from '../components/ThermalReceiptModal'
import sounds from '../utils/audio'
import { toast } from '../components/Toast'

export default function POS() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState(['Hammasi'])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Hammasi')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [completedOrderData, setCompletedOrderData] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [customerName, setCustomerName] = useState('Naqd Xaridor')
  const [isScannerActive, setIsScannerActive] = useState(false)
  const [scannedMessage, setScannedMessage] = useState('')

  const [customerList, setCustomerList] = useState([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')

  useEffect(() => {
    loadProducts()
    loadCategories()
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    try {
      const res = await api.getCustomers()
      setCustomerList(res?.data || [])
    } catch (_) {}
  }

  const loadProducts = async () => {
    try {
      setLoading(true)
      const res = await api.getProducts()
      setProducts(res?.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const cats = await api.getProductCategories()
      setCategories(['Hammasi', ...(cats || [])])
    } catch (_) {}
  }

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode && p.barcode.includes(search))
    const matchesCategory = category === 'Hammasi' || p.category === category
    return matchesSearch && matchesCategory
  })

  const addToCart = (product) => {
    const stock = Number(product.stock ?? 0)
    if (stock < 1) {
      toast.error(`"${product.name}" omborda tugagan`)
      return
    }
    sounds.playBeep()
    setCart(prev => {
      const existing = prev.find(item => item._id === product._id)
      if (existing) {
        // Qoldiqdan oshib ketmasin
        if (existing.qty >= stock) {
          toast.error(`"${product.name}" uchun qoldiq faqat ${stock} ta`)
          return prev
        }
        return prev.map(item => item._id === product._id ? { ...item, qty: item.qty + 1 } : item)
      }
      return [...prev, { ...product, qty: 1 }]
    })
  }

  const removeFromCart = (productId) => {
    sounds.playClick()
    setCart(prev => {
      const existing = prev.find(item => item._id === productId)
      if (existing?.qty === 1) {
        return prev.filter(item => item._id !== productId)
      }
      return prev.map(item => item._id === productId ? { ...item, qty: item.qty - 1 } : item)
    })
  }

  const deleteFromCart = (productId) => {
    sounds.playClick()
    setCart(prev => prev.filter(item => item._id !== productId))
  }

  const total = cart.reduce((acc, item) => acc + (item.price * item.qty), 0)
  const totalItems = cart.reduce((acc, item) => acc + item.qty, 0)

  // Scanner Simulator Trigger
  const triggerScan = () => {
    sounds.playBeep()
    if (products.length > 0) {
      const randomProd = products[Math.floor(Math.random() * products.length)]
      addToCart(randomProd)
      setScannedMessage(`Skanerlandi: ${randomProd.name}`)
      setTimeout(() => setScannedMessage(''), 2500)
    }
  }

  const completeSale = async () => {
    if (cart.length === 0) return
    if (paymentMethod === 'nasiya' && (!customerName || customerName === 'Naqd Xaridor')) {
      toast.error('Nasiya (qarz) uchun mijoz ismini tanlang yoki kiriting')
      return
    }
    setProcessing(true)
    try {
      sounds.playCashChing()
      const items = cart.map(item => ({
        name: item.name,
        qty: item.qty,
        price: item.price,
        category: item.category || '',
      }))
      const PM_MAP = { cash: 'cash', card: 'card', app: 'click', nasiya: 'nasiya' }

      // Avval backendga saqlanadi — faqat muvaffaqiyatli bo'lsa chek chiqadi
      const data = await api.createOrder({
        customer: customerName || 'Sotuv (POS)',
        items,
        paymentMethod: PM_MAP[paymentMethod] || 'cash',
        source: 'pos',
      })

      const savedOrder = data?.data || {}
      const newOrd = {
        _id: savedOrder._id || `POS-${Math.floor(100000 + Math.random() * 900000)}`,
        orderNumber: savedOrder.orderNumber,
        customer: customerName || 'Naqd Xaridor',
        items,
        total: savedOrder.total ?? total, // server hisoblagan summa asosiy manba
        paymentMethod: paymentMethod === 'cash' ? 'Naqd Pul' : paymentMethod === 'card' ? 'Humo / Uzcard' : paymentMethod === 'nasiya' ? 'Nasiya (Qarz)' : 'Click / Payme',
        createdAt: savedOrder.createdAt || new Date(),
      }

      setCompletedOrderData(newOrd)
      setShowReceiptModal(true)
      setCart([])
      loadProducts() // Stokni yangilash
      loadCustomers() // Nasiya va mijoz statistikasini yangilash
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setProcessing(false)
    }
  }

  const formatPrice = (p) => new Intl.NumberFormat('ru-RU').format(p) + " so'm"

  return (
    <div className="space-y-4 animate-fade-in pb-8">
      {/* Receipt Modal */}
      {showReceiptModal && (
        <ThermalReceiptModal
          order={completedOrderData}
          onClose={() => {
            setShowReceiptModal(false)
            setCompletedOrderData(null)
          }}
        />
      )}

      {/* Laser Barcode Scanner Simulator Modal */}
      {isScannerActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 text-white text-center space-y-4">
            <button
              onClick={() => setIsScannerActive(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-lg">
              <Camera className="w-6 h-6 animate-pulse" /> Live Kamera & Laser Skaner (POS)
            </div>
            <div className="relative w-full h-64 bg-slate-950 rounded-2xl overflow-hidden border-2 border-emerald-500/50 flex items-center justify-center">
              <div className="absolute inset-x-0 h-0.5 bg-rose-500 shadow-[0_0_15px_#f43f5e] animate-laser" />
              <div className="text-center space-y-2 z-10">
                <Barcode className="w-16 h-16 mx-auto opacity-30 text-emerald-400" />
                <p className="text-xs text-slate-400">Shtrix-kodni kamera oldiga tuting...</p>
              </div>
            </div>

            {scannedMessage && (
              <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-xl text-xs font-bold animate-bounce">
                {scannedMessage}
              </div>
            )}

            <button
              onClick={triggerScan}
              className="w-full btn-primary bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold py-3 shadow-lg"
            >
              <Zap className="w-4 h-4" /> Test Skaner Qilish (Simulyatsiya)
            </button>
          </div>
        </div>
      )}

      {/* POS Top Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Tezkor Kassa POS
            <span className="text-xs font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20">
              High-Speed Register
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Shtrix-kod skaneri va bitta tugma orqali sotuvni amalga oshirish
          </p>
        </div>

        <button
          onClick={() => {
            sounds.playClick()
            setIsScannerActive(true)
          }}
          className="btn-primary py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-500/20"
        >
          <Barcode className="w-4 h-4" /> Laser Skanerni Yoqish
        </button>
      </div>

      {/* POS Layout Split */}
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-13rem)]">
        {/* Products Grid Column */}
        <div className="flex-1 flex flex-col gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Search & Categories Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Mahsulot nomi yoki shtrix-kodini kiriting..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => {
                    sounds.playClick()
                    setCategory(c)
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    category === c
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Products List Grid */}
          <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 content-start pr-1">
            {loading ? (
              <div className="col-span-full flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredProducts.map(product => (
              <button
                key={product._id}
                onClick={() => addToCart(product)}
                className="card p-3.5 text-left hover:border-emerald-500 hover:scale-[1.02] transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="w-full aspect-video bg-gradient-to-tr from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-xl mb-2.5 flex items-center justify-center group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/40 transition">
                    <ShoppingCart className="w-6 h-6 text-slate-400 group-hover:text-emerald-500 group-hover:scale-110 transition" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2">{product.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{product.category}</p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2">
                  <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                    {formatPrice(product.price)}
                  </span>
                  <div className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Shopping Cart & Checkout Sidebar Column */}
        <div className="w-full lg:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 flex flex-col">
          {/* Cart Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">Savatcha</h3>
            </div>
            <span className="text-xs font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20">
              {totalItems} ta mahsulot
            </span>
          </div>

          {/* Customer Selection Input */}
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              list="customer-suggestions"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Mijoz tanlang yoki yozing..."
              className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-200 outline-none font-medium"
            />
            <datalist id="customer-suggestions">
              {customerList.map(c => (
                <option key={c._id} value={c.name}>
                  {c.phone ? `${c.phone} ` : ''}{c.debt > 0 ? `(Qarzi: ${formatPrice(c.debt)})` : ''}
                </option>
              ))}
            </datalist>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cart.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-xs font-semibold">Savatcha boʻsh</p>
                <p className="text-[11px] mt-1 text-slate-400">Sotuv qilish uchun mahsulot bosing</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item._id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/50 dark:border-slate-800">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{item.name}</p>
                    <p className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {formatPrice(item.price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border p-1 rounded-lg">
                    <button onClick={() => removeFromCart(item._id)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold w-5 text-center">{item.qty}</span>
                    <button onClick={() => addToCart(item)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-emerald-600">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <button onClick={() => deleteFromCart(item._id)} className="p-1.5 text-slate-400 hover:text-rose-500 ml-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Payment Method & Checkout */}
          {cart.length > 0 && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-2xl">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Toʻlov Usulini Tanlang</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'cash', label: 'Naqd', icon: DollarSign },
                    { id: 'card', label: 'Karta', icon: CreditCard },
                    { id: 'app', label: 'Click/Payme', icon: Smartphone },
                    { id: 'nasiya', label: 'Nasiya', icon: UserCheck },
                  ].map((m) => {
                    const Icon = m.icon
                    const isSelected = paymentMethod === m.id
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          sounds.playClick()
                          setPaymentMethod(m.id)
                        }}
                        className={`p-2 rounded-xl text-center text-xs font-bold transition flex flex-col items-center gap-1 ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[10px]">{m.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Jami Summa:</span>
                <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                  {formatPrice(total)}
                </span>
              </div>

              <button
                onClick={completeSale}
                disabled={processing}
                className="btn-primary w-full py-3 text-sm font-extrabold shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" /> Toʻlovni Yakunlash & Chek Chiqarish
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
