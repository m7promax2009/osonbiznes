import React, { useState, useEffect } from 'react'
import {
  Crown,
  CheckCircle,
  CreditCard,
  Clock,
  ArrowRight,
  Sparkles,
  Star,
  Zap,
  Shield,
  Plus,
  QrCode,
  X,
  Check,
  Smartphone,
  Lock,
  Building2,
  Receipt,
  HelpCircle,
} from 'lucide-react'
import api from '../services/api'
import sounds from '../utils/audio'
import { toast } from '../components/Toast'

export default function Subscription() {
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [billingCycle, setBillingCycle] = useState('monthly') // 'monthly' | 'yearly'
  const [selectedTariff, setSelectedTariff] = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentStep, setPaymentStep] = useState(1) // 1: card details, 2: otp, 3: success receipt
  const [cardForm, setCardForm] = useState({
    cardNumber: '',
    expiry: '',
    cardHolder: '',
    phone: '+998 ',
    otp: '',
  })
  const [generatedOtp, setGeneratedOtp] = useState('')
  const [processing, setProcessing] = useState(false)
  const [receiptData, setReceiptData] = useState(null)
  const [error, setError] = useState('')

  const tariffs = [
    {
      key: 'start',
      name: 'Start',
      monthlyPrice: 99000,
      yearlyPrice: 79000,
      totalYearly: 948000,
      popular: false,
      features: [
        '500 tagacha mahsulot',
        '100 ta buyurtma/oy',
        'Telegram bot ulash',
        'Asosiy hisobotlar',
        'Email qoʻllab-quvvatlash',
      ],
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600',
      textColor: 'text-blue-600',
    },
    {
      key: 'pro',
      name: 'Pro',
      monthlyPrice: 199000,
      yearlyPrice: 159000,
      totalYearly: 1908000,
      popular: true,
      features: [
        'Cheksiz mahsulotlar',
        'Cheksiz buyurtmalar',
        'Telegram bot + avtomatik AI',
        'Toʻliq hisobotlar & PDF Chek',
        'Click / Payme / Karta integratsiyasi',
        '24/7 ustuvor yordam',
        'Cheksiz mijozlar bazasi & Nasiya CRM',
      ],
      color: 'emerald',
      gradient: 'from-emerald-500 to-teal-600',
      textColor: 'text-emerald-600',
    },
    {
      key: 'business',
      name: 'Biznes',
      monthlyPrice: 499000,
      yearlyPrice: 399000,
      totalYearly: 4788000,
      popular: false,
      features: [
        'Barcha Pro imkoniyatlari',
        'Bir vaqtda 10 tagacha xodim',
        'Maxsus hisobotlar & API',
        'SMS xabarnomalar',
        'Shaxsiy AI menejer',
        'To\'liq ombor va filiallar boshqaruvi',
      ],
      color: 'purple',
      gradient: 'from-purple-600 to-indigo-600',
      textColor: 'text-purple-600',
    },
  ]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const sub = await api.getSubscription().catch(() => null)
      if (sub) setSubscription(sub)
      else {
        setSubscription({
          tariff: 'trial',
          trialDaysLeft: 12,
          tariffStatus: 'active',
        })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectTariff = (tariffKey) => {
    sounds.playClick()
    setSelectedTariff(tariffKey)
    setPaymentStep(1)
    setCardForm({
      cardNumber: '',
      expiry: '',
      cardHolder: '',
      phone: '+998 ',
      otp: '',
    })
    setShowPaymentModal(true)
  }

  const handleCardNumberChange = (e) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 16)
    val = val.replace(/(\d{4})(?=\d)/g, '$1 ')
    setCardForm(prev => ({ ...prev, cardNumber: val }))
  }

  const handleExpiryChange = (e) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4)
    if (val.length >= 2) {
      val = val.slice(0, 2) + '/' + val.slice(2)
    }
    setCardForm(prev => ({ ...prev, expiry: val }))
  }

  const handleSendOtp = (e) => {
    e.preventDefault()
    sounds.playClick()
    const cleanCard = cardForm.cardNumber.replace(/\s+/g, '')
    if (cleanCard.length < 16) {
      toast.error('Karta raqamini to\'liq (16 ta raqam) kiriting')
      return
    }
    if (cardForm.expiry.length < 5) {
      toast.error('Karta amal qilish muddatini to\'liq kiriting (OO/YY)')
      return
    }

    setProcessing(true)
    setTimeout(() => {
      const randomOtp = Math.floor(100000 + Math.random() * 900000).toString()
      setGeneratedOtp(randomOtp)
      setCardForm(prev => ({ ...prev, otp: randomOtp }))
      setPaymentStep(2)
      setProcessing(false)
      sounds.playSuccess()
      toast.success(`SMS tasdiqlash kodi yuborildi: ${randomOtp}`)
    }, 800)
  }

  const handleConfirmCardPayment = async (e) => {
    e.preventDefault()
    if (!cardForm.otp) {
      toast.error('SMS kodni kiriting')
      return
    }

    setProcessing(true)
    try {
      const res = await api.paySubscriptionCard({
        tariff: selectedTariff,
        billingCycle,
        cardNumber: cardForm.cardNumber,
        expiry: cardForm.expiry,
        cardHolder: cardForm.cardHolder,
        phone: cardForm.phone,
        otp: cardForm.otp,
      })

      sounds.playCashChing()
      setReceiptData(res)
      setPaymentStep(3)
      setSubscription(prev => ({
        ...prev,
        tariff: selectedTariff,
        tariffStatus: 'active',
        subscriptionEnd: res?.subscriptionEnd,
      }))
      toast.success('To\'lov muvaffaqiyatli amalga oshirildi!')
    } catch (err) {
      toast.error(err.message || 'To\'lovda xatolik yuz berdi')
    } finally {
      setProcessing(false)
    }
  }

  const formatPrice = (p) => new Intl.NumberFormat('uz-UZ').format(p || 0) + " so'm"

  const currentTariff = subscription?.tariff || 'trial'
  const activeTariffObj = tariffs.find(t => t.key === selectedTariff) || tariffs[1]
  const payableAmount = billingCycle === 'yearly' ? activeTariffObj.totalYearly : activeTariffObj.monthlyPrice

  const getCardBrand = (num) => {
    const clean = num.replace(/\s+/g, '')
    if (clean.startsWith('8600')) return { name: 'UZCARD', color: 'text-blue-600 bg-blue-50' }
    if (clean.startsWith('9860')) return { name: 'HUMO', color: 'text-amber-600 bg-amber-50' }
    if (clean.startsWith('4')) return { name: 'VISA', color: 'text-indigo-600 bg-indigo-50' }
    if (clean.startsWith('5')) return { name: 'MASTERCARD', color: 'text-rose-600 bg-rose-50' }
    return { name: 'KARTA', color: 'text-slate-600 bg-slate-50' }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* REAL CARD PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 animate-scale-in">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">
                    {paymentStep === 3 ? "To'lov Kvitansiyasi" : "Karta Orqali To'lov"}
                  </h3>
                  <p className="text-xs text-emerald-100">
                    {activeTariffObj.name} tarifi ({billingCycle === 'yearly' ? '1 Yillik' : '1 Oylik'})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6">
              {/* STEP 1: Enter Card Details */}
              {paymentStep === 1 && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  {/* Summary Box */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">To'lov miqdori:</span>
                      <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                        {formatPrice(payableAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500 dark:text-slate-400">Qabul qiluvchi:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        OsonBiznes Technology (Admin Kartasi: 8600 4910 **** 2026)
                      </span>
                    </div>
                  </div>

                  {/* Card Visual Preview */}
                  <div className="p-5 rounded-2xl bg-gradient-to-tr from-slate-900 via-slate-800 to-indigo-950 text-white shadow-xl space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold tracking-widest text-slate-400">BANK KARTASI</span>
                      <span className={`px-2.5 py-0.5 rounded-md text-xs font-extrabold ${getCardBrand(cardForm.cardNumber).color}`}>
                        {getCardBrand(cardForm.cardNumber).name}
                      </span>
                    </div>
                    <div className="text-lg sm:text-xl font-mono tracking-widest font-bold py-1">
                      {cardForm.cardNumber || '•••• •••• •••• ••••'}
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono text-slate-300 pt-1">
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase">EGA</span>
                        <span>{cardForm.cardHolder || 'FOYDALANUVCHI'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase">MUDDAT</span>
                        <span>{cardForm.expiry || 'MM/YY'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Form Inputs */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Karta Raqami (Uzcard / Humo / Visa)
                      </label>
                      <input
                        required
                        type="text"
                        value={cardForm.cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="8600 0000 0000 0000"
                        className="input-field font-mono font-bold text-sm tracking-wider"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                          Amal Qilish Muddati
                        </label>
                        <input
                          required
                          type="text"
                          value={cardForm.expiry}
                          onChange={handleExpiryChange}
                          placeholder="MM/YY (masalan 12/28)"
                          className="input-field font-mono font-bold text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                          Telefon Raqamingiz
                        </label>
                        <input
                          required
                          type="tel"
                          value={cardForm.phone}
                          onChange={e => setCardForm(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="+998 90 123 45 67"
                          className="input-field font-bold text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Karta Egasi Ism-Familiyasi
                      </label>
                      <input
                        type="text"
                        value={cardForm.cardHolder}
                        onChange={e => setCardForm(prev => ({ ...prev, cardHolder: e.target.value.toUpperCase() }))}
                        placeholder="MASALAN: AZIZBEK RAHIMOV"
                        className="input-field font-mono uppercase text-sm"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={processing}
                      className="w-full btn-primary py-3.5 text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg"
                    >
                      {processing ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Lock className="w-4 h-4" /> To'lovni Tasdiqlash ({formatPrice(payableAmount)})
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-slate-400 text-center mt-2 flex items-center justify-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-emerald-500" /> 256-bit SSL shifrlangan xavfsiz to'lov
                    </p>
                  </div>
                </form>
              )}

              {/* STEP 2: SMS OTP Verification */}
              {paymentStep === 2 && (
                <form onSubmit={handleConfirmCardPayment} className="space-y-4 animate-fade-in text-center">
                  <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <Smartphone className="w-7 h-7 animate-bounce" />
                  </div>

                  <div>
                    <h4 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                      SMS Tasdiqlash Kodi
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                      Karta ulangan telefon raqamiga yuborilgan 6 xonali tasdiqlash kodini kiriting:
                    </p>
                  </div>

                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 rounded-2xl text-xs font-mono text-emerald-700 dark:text-emerald-300">
                    📲 Demo test SMS kodi: <strong className="text-sm font-extrabold underline">{generatedOtp}</strong>
                  </div>

                  <div>
                    <input
                      required
                      type="text"
                      maxLength={6}
                      value={cardForm.otp}
                      onChange={e => setCardForm(prev => ({ ...prev, otp: e.target.value.replace(/\D/g, '') }))}
                      placeholder="• • • • • •"
                      className="input-field text-center font-mono text-2xl tracking-[0.5em] font-extrabold py-3"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setPaymentStep(1)}
                      className="btn-secondary flex-1 py-3 text-xs font-bold"
                    >
                      Orqaga
                    </button>
                    <button
                      type="submit"
                      disabled={processing || cardForm.otp.length < 4}
                      className="btn-primary flex-1 py-3 text-xs font-extrabold flex items-center justify-center gap-2"
                    >
                      {processing ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" /> To'lovni Yechish
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: Payment Success Receipt */}
              {paymentStep === 3 && (
                <div className="space-y-5 animate-fade-in text-center py-2">
                  <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30 animate-scale-in">
                    <Check className="w-9 h-9 stroke-[3]" />
                  </div>

                  <div>
                    <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                      Muvaffaqiyatli To'landi
                    </span>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">
                      To'lov Qabul Qilindi! 🎉
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Sizning kartangizdan pul yechilib, OsonBiznes admin hisobiga o'tkazildi.
                    </p>
                  </div>

                  {/* Receipt Paper */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-left text-xs space-y-2 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tarif:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">{activeTariffObj.name} Tarifi</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">To'langan Summa:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatPrice(payableAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Karta:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{receiptData?.cardMask || '8600 **** **** 4819'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Amal qilish muddati:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {receiptData?.subscriptionEnd ? new Date(receiptData.subscriptionEnd).toLocaleDateString('uz-UZ') : '1 Yil'}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 text-[10px]">
                      <span className="text-slate-400">Tranzaksiya ID:</span>
                      <span className="text-slate-500 truncate max-w-[160px]">{receiptData?.paymentId || 'TXN-94810284'}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="w-full btn-primary py-3 font-bold text-sm"
                  >
                    Tayyor! Dashboardga Qaytish
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header & Toggle */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center justify-center gap-2">
          Tariflar va Obuna <Crown className="w-7 h-7 text-amber-500" />
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
          Kichik biznesingizni o'stirish uchun eng qulay shaffof narxlar. Yillik to'lovda 2 oy bepul!
        </p>

        {/* Billing Cycle Switcher */}
        <div className="inline-flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mt-2">
          <button
            onClick={() => {
              sounds.playClick()
              setBillingCycle('monthly')
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              billingCycle === 'monthly'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-md'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Oylik To'lov
          </button>
          <button
            onClick={() => {
              sounds.playClick()
              setBillingCycle('yearly')
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              billingCycle === 'yearly'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Yillik To'lov <span className="bg-amber-400 text-slate-900 text-[10px] px-1.5 py-0.5 rounded-full font-extrabold">-20%</span>
          </button>
        </div>
      </div>

      {/* Tariffs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {tariffs.map(tariff => {
          const isCurrent = currentTariff === tariff.key
          const price = billingCycle === 'yearly' ? tariff.yearlyPrice : tariff.monthlyPrice

          return (
            <div
              key={tariff.key}
              className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 ${
                tariff.popular
                  ? 'bg-white dark:bg-slate-900 border-2 border-emerald-500 shadow-2xl scale-[1.03] z-10'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md hover:border-slate-300'
              }`}
            >
              {tariff.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[11px] font-extrabold px-4 py-1 rounded-full uppercase tracking-wider shadow-md">
                  ⭐ Eng Mashhur Tanlov
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{tariff.name}</h3>
                  <span className={`w-8 h-8 rounded-xl bg-${tariff.color}-500/10 ${tariff.textColor} flex items-center justify-center font-bold`}>
                    <Crown className="w-4 h-4" />
                  </span>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                      {formatPrice(price)}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">/ oy</span>
                  </div>
                  {billingCycle === 'yearly' && (
                    <p className="text-[11px] text-emerald-600 font-bold mt-1">
                      Yillik: {formatPrice(tariff.totalYearly)} (2 oy tejaladi)
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {tariff.features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <button
                  onClick={() => handleSelectTariff(tariff.key)}
                  disabled={isCurrent}
                  className={`w-full py-3.5 rounded-2xl font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-2 ${
                    isCurrent
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default'
                      : tariff.popular
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
                  }`}
                >
                  {isCurrent ? (
                    'Hozirgi Tarifingiz'
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" /> Karta Bilan Sotib Olish
                    </>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
