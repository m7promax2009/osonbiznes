import React, { useState } from 'react'
import {
  ShoppingBag,
  X,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  Store,
  MapPin,
  Phone,
  CreditCard,
  Truck,
  Building2,
  Shield,
  Smartphone,
  Check,
  AlertCircle,
  ExternalLink,
  Receipt,
  Printer,
  Package,
  Info,
} from 'lucide-react'
import api, { resolveImageUrl } from '../services/api'
import sounds from '../utils/audio'
import { toast } from './Toast'

export default function MarketplaceCartModal({
  isOpen,
  onClose,
  cart = [],
  onUpdateQty,
  onRemoveItem,
  onClearCart,
}) {
  const [step, setStep] = useState(1) // 1: Cart Items, 2: Checkout Form & Payment, 3: Success Receipt
  const [form, setForm] = useState({
    customer: '',
    phone: '+998 ',
    address: '',
    deliveryMethod: 'delivery', // pickup | delivery
    paymentMethod: 'cash', // cash | card | click | payme
    cardNumber: '',
    expiry: '',
    cardHolder: '',
    otp: '',
  })
  const [generatedOtp, setGeneratedOtp] = useState('')
  const [processing, setProcessing] = useState(false)
  const [orderResults, setOrderResults] = useState([])
  const [error, setError] = useState('')

  if (!isOpen) return null

  const formatPrice = (p) => new Intl.NumberFormat('uz-UZ').format(p || 0) + " so'm"

  // Group items by shopId
  const itemsByShop = cart.reduce((acc, item) => {
    const sId = item.shopId || 'unknown'
    if (!acc[sId]) {
      acc[sId] = {
        shopName: item.shopName || "OsonBiznes Do'koni",
        items: [],
      }
    }
    acc[sId].items.push(item)
    return acc
  }, {})

  const shopCount = Object.keys(itemsByShop).length
  const deliveryPerShop = 20000
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0)
  const deliveryFee = form.deliveryMethod === 'delivery' ? (deliveryPerShop * shopCount) : 0
  const grandTotal = cartTotal + deliveryFee

  const handleCardNumberChange = (e) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 16)
    val = val.replace(/(\d{4})(?=\d)/g, '$1 ')
    setForm(prev => ({ ...prev, cardNumber: val }))
  }

  const handleExpiryChange = (e) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4)
    if (val.length >= 2) {
      val = val.slice(0, 2) + '/' + val.slice(2)
    }
    setForm(prev => ({ ...prev, expiry: val }))
  }

  const handleSendCardOtp = () => {
    const cleanCard = form.cardNumber.replace(/\s+/g, '')
    if (cleanCard.length < 16) {
      toast.error("Karta raqamini to'liq (16 ta raqam) kiriting")
      return false
    }
    if (form.expiry.length < 5) {
      toast.error("Karta amal qilish muddatini to'liq kiriting (OO/YY)")
      return false
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    setGeneratedOtp(otp)
    setForm(prev => ({ ...prev, otp }))
    sounds.playSuccess()
    toast.success(`SMS tasdiqlash kodi: ${otp}`)
    return true
  }

  const handlePlaceOrder = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.customer.trim() || form.phone.trim().length < 9) {
      setError("Iltimos, ismingiz va to'liq telefon raqamingizni kiriting")
      return
    }

    if (form.paymentMethod === 'card' && !form.otp) {
      const ok = handleSendCardOtp()
      if (!ok) return
    }

    setProcessing(true)

    try {
      sounds.playClick()
      const createdOrders = []

      // Submit an order for each shop represented in cart
      for (const [shopId, shopData] of Object.entries(itemsByShop)) {
        const shopItems = shopData.items.map(i => ({
          productId: i.productId || i._id,
          name: i.name,
          qty: i.qty,
          price: i.price,
        }))

        const shopItemsTotal = shopItems.reduce((s, i) => s + (i.price * i.qty), 0)
        const shopOrderTotal = shopItemsTotal + (form.deliveryMethod === 'delivery' ? deliveryPerShop : 0)

        const res = await api.request('/telegram/order', {
          method: 'POST',
          body: {
            customer: form.customer.trim(),
            phone: form.phone.trim(),
            items: shopItems,
            total: shopOrderTotal,
            source: 'marketplace_cart',
            ownerId: shopId,
            address: form.address.trim(),
            deliveryMethod: form.deliveryMethod,
            paymentMethod: form.paymentMethod,
            paymentStatus: form.paymentMethod === 'card' ? 'paid' : 'unpaid',
          },
        })

        createdOrders.push({
          shopName: shopData.shopName,
          orderId: res.data?.orderNumber || res.data?.orderId || `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
          total: shopOrderTotal,
          itemsCount: shopItems.reduce((s, i) => s + i.qty, 0),
          delivery: form.deliveryMethod === 'delivery' ? 'Kuryer orqali yetkazish' : 'Do\'kondan olib ketish',
        })
      }

      sounds.playCashChing()
      setOrderResults(createdOrders)
      onClearCart()
      setStep(3)
      toast.success("Barcha do'konlarga buyurtma muvaffaqiyatli yuborildi!")
    } catch (err) {
      setError(err.message || "Buyurtma berishda xatolik yuz berdi")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-scale-in">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">
                {step === 1 ? 'Xarid Savati' : step === 2 ? 'Buyurtma & To\'lov' : 'Buyurtmalar Qabul Qilindi'}
              </h3>
              <p className="text-xs text-emerald-100">
                {step === 1 ? `${shopCount} ta do'kondan ${cart.reduce((s, i) => s + i.qty, 0)} ta tovar` : 'OsonBozor Xavfsiz Xarid'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* STEP 1: CART ITEMS LIST GROUPED BY SHOP */}
          {step === 1 && (
            <div className="space-y-4">
              {cart.length === 0 ? (
                <div className="py-14 text-center text-slate-400">
                  <ShoppingBag className="w-14 h-14 mx-auto mb-3 opacity-20" />
                  <h4 className="font-extrabold text-slate-700 dark:text-slate-200 text-sm">Savatingiz bo'sh</h4>
                  <p className="text-xs text-slate-400 mt-1">Marketplace vitrinasidan mahsulotlarni tanlang</p>
                </div>
              ) : (
                <>
                  {/* Notice if multiple shops */}
                  {shopCount > 1 && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-500/20 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                      <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Eslatma:</span> Siz <strong>{shopCount} ta turli do'kon</strong>dan tovar tanladingiz. Har bir do'kon o'z tovarini o'z omboridan mustaqil qadoqlab, kuryer orqali yuboradi.
                      </div>
                    </div>
                  )}

                  {/* Groups of Shops */}
                  <div className="space-y-4">
                    {Object.entries(itemsByShop).map(([shopId, shopData], sIdx) => {
                      const shopSum = shopData.items.reduce((s, i) => s + (i.price * i.qty), 0)
                      return (
                        <div
                          key={shopId}
                          className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-3"
                        >
                          {/* Shop header pill */}
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 dark:border-slate-700">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-emerald-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                                {sIdx + 1}
                              </span>
                              <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                                <Store className="w-3.5 h-3.5 text-emerald-600" /> {shopData.shopName}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              {formatPrice(shopSum)}
                            </span>
                          </div>

                          {/* Items in this shop */}
                          <div className="space-y-2.5">
                            {shopData.items.map((item) => (
                              <div
                                key={item.productId || item._id}
                                className="flex items-center gap-3 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs"
                              >
                                <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                                  {item.images?.[0] ? (
                                    <img src={resolveImageUrl(item.images[0])} alt={item.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold">📦</div>
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{item.name}</h4>
                                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                    {formatPrice(item.price)}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                                  <button
                                    onClick={() => onUpdateQty(item.productId || item._id, -1)}
                                    className="w-5 h-5 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs font-bold shadow-xs hover:bg-slate-100"
                                  >
                                    <Minus className="w-2.5 h-2.5" />
                                  </button>
                                  <span className="text-xs font-bold w-4 text-center text-slate-800 dark:text-slate-100">
                                    {item.qty}
                                  </span>
                                  <button
                                    onClick={() => onUpdateQty(item.productId || item._id, 1)}
                                    className="w-5 h-5 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs font-bold shadow-xs hover:bg-slate-100"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                  </button>
                                </div>

                                <button
                                  onClick={() => onRemoveItem(item.productId || item._id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-md transition"
                                  title="O'chirish"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Summary Box */}
                  <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-500/20 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Jami Savat Summasi:</span>
                      <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{formatPrice(cartTotal)}</p>
                    </div>
                    <button
                      onClick={() => {
                        sounds.playClick()
                        setStep(2)
                      }}
                      className="btn-primary px-5 py-3 font-bold text-xs shadow-md"
                    >
                      Buyurtmaga O'tish →
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 2: CHECKOUT & PAYMENT METHOD */}
          {step === 2 && (
            <form onSubmit={handlePlaceOrder} className="space-y-4">
              {/* Delivery Choice */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Yetkazib Berish Usuli
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, deliveryMethod: 'delivery' })}
                    className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 ${
                      form.deliveryMethod === 'delivery'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 font-bold text-emerald-900 dark:text-emerald-200'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    <Truck className="w-4 h-4 text-emerald-600" />
                    <div>
                      <p className="text-xs">Kuryer orqali yetkazish</p>
                      <p className="text-[10px] text-slate-400 font-normal">
                        {shopCount > 1 ? `${shopCount} ta do'kon: ${formatPrice(deliveryPerShop * shopCount)}` : `${formatPrice(deliveryPerShop)}`}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, deliveryMethod: 'pickup' })}
                    className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 ${
                      form.deliveryMethod === 'pickup'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 font-bold text-emerald-900 dark:text-emerald-200'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    <Store className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="text-xs">Do'kondan olib ketish</p>
                      <p className="text-[10px] text-slate-400 font-normal">Bepul (0 so'm)</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Customer Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Ismingiz
                  </label>
                  <input
                    required
                    type="text"
                    value={form.customer}
                    onChange={e => setForm({ ...form, customer: e.target.value })}
                    placeholder="Masalan: Sardor Aliyev"
                    className="input-field text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Telefon Raqamingiz
                  </label>
                  <input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="+998 90 123 45 67"
                    className="input-field text-xs font-bold font-mono"
                  />
                </div>
              </div>

              {form.deliveryMethod === 'delivery' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Yetkazish Manzili (Shahar, tuman, ko'cha, uy)
                  </label>
                  <input
                    required
                    type="text"
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                    placeholder="Toshkent sh., Chilonzor 9, 12-uy"
                    className="input-field text-xs"
                  />
                </div>
              )}

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  To'lov Usuli
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'cash', label: '💵 Naqd Pul', desc: 'Qabul qilishda' },
                    { key: 'card', label: '💳 Online Karta', desc: 'Uzcard / Humo' },
                    { key: 'click', label: '📲 Click / Payme', desc: 'Ilova orqali' },
                  ].map(pm => (
                    <button
                      key={pm.key}
                      type="button"
                      onClick={() => setForm({ ...form, paymentMethod: pm.key })}
                      className={`p-2.5 rounded-xl border text-center transition ${
                        form.paymentMethod === pm.key
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-extrabold shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600'
                      }`}
                    >
                      <p className="text-xs">{pm.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{pm.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* If Card Payment is selected */}
              {form.paymentMethod === 'card' && (
                <div className="p-4 rounded-2xl bg-gradient-to-tr from-slate-900 via-slate-800 to-indigo-950 text-white space-y-3 animate-fade-in shadow-xl">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>XAVFSIZ TO'LOV</span>
                    <span className="text-emerald-400 font-bold">UZCARD / HUMO / VISA</span>
                  </div>

                  <div>
                    <input
                      required
                      type="text"
                      value={form.cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="8600 0000 0000 0000"
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm font-mono tracking-widest text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      required
                      type="text"
                      value={form.expiry}
                      onChange={handleExpiryChange}
                      placeholder="MM/YY"
                      className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400"
                    />
                    <input
                      type="text"
                      value={form.cardHolder}
                      onChange={e => setForm({ ...form, cardHolder: e.target.value.toUpperCase() })}
                      placeholder="KARTA EGASI"
                      className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs uppercase text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  {generatedOtp && (
                    <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-center text-xs text-emerald-200">
                      📲 SMS Kod: <strong className="text-white underline">{generatedOtp}</strong>
                    </div>
                  )}

                  {generatedOtp && (
                    <div>
                      <input
                        required
                        type="text"
                        maxLength={6}
                        value={form.otp}
                        onChange={e => setForm({ ...form, otp: e.target.value })}
                        placeholder="6 xonali SMS kodni kiriting"
                        className="w-full bg-white text-slate-900 font-mono text-center font-bold tracking-[0.3em] rounded-xl py-2 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Total & Submit */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Mahsulotlar ({cart.reduce((s, i) => s + i.qty, 0)} ta):</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{formatPrice(cartTotal)}</span>
                </div>
                {form.deliveryMethod === 'delivery' && (
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Yetkazib berish ({shopCount} ta do'kon posilkasi):</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatPrice(deliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-extrabold text-slate-900 dark:text-slate-100 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span>Jami To'lov:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{formatPrice(grandTotal)}</span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn-secondary flex-1 py-3 text-xs font-bold"
                  >
                    Savatga Qaytish
                  </button>
                  <button
                    type="submit"
                    disabled={processing}
                    className="btn-primary flex-2 py-3 text-xs font-extrabold flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Barcha Buyurtmalarni Tasdiqlash
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* STEP 3: ORDER CONFIRMED RECEIPT */}
          {step === 3 && (
            <div className="text-center py-4 space-y-4 animate-fade-in">
              <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30 animate-scale-in">
                <Check className="w-9 h-9 stroke-[3]" />
              </div>

              <div>
                <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  {orderResults.length} ta Do'konga Buyurtmalar Yuborildi
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">
                  Rahmat, {form.customer}! 🎉
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Har bir do'kon o'z posilkasini qabul qildi va yetkazib berish uchun tayyorlaydi.
                </p>
              </div>

              {/* Order Receipts Breakdown */}
              <div className="space-y-2 text-left text-xs font-mono">
                {orderResults.map((ord, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                      <span>🏪 {ord.shopName}</span>
                      <span className="text-emerald-600 dark:text-emerald-400">{formatPrice(ord.total)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Buyurtma raqami: <strong>{ord.orderId}</strong></span>
                      <span>{ord.itemsCount} ta tovar</span>
                    </div>
                    <div className="text-[10px] text-slate-500 pt-0.5">
                      🚚 {ord.delivery}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="w-full btn-primary py-3 font-bold text-sm"
                >
                  Xaridni Davom Ettirish
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
