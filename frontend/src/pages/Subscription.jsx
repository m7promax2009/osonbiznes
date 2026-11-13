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
  const [paymentStep, setPaymentStep] = useState(1) // 1: rekvizitlar + o'tkazma, 2: tekshiruvda
  const [payerCardLast4, setPayerCardLast4] = useState('')
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
        '300 tagacha mijoz',
        'Telegram bot ulash',
        'Asosiy hisobotlar',
        'Email yordam',
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
        'Cheksiz mahsulot va mijozlar',
        'Nasiya daftari (qarzlar CRM)',
        'Kassa (POS) va chek',
        'Telegram bot + biznes maslahatchi',
        "To'liq hisobotlar",
        'Ustuvor yordam',
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
        'Ustuvor shaxsiy yordam',
        'Yangi imkoniyatlarga birinchi bo\'lib kirish',
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
    setPayerCardLast4('')
    setShowPaymentModal(true)
  }

  const copyCard = async () => {
    try {
      await navigator.clipboard.writeText(subscription?.paymentDetails?.card?.replace(/\s+/g, '') || '')
      toast.success('Karta raqami nusxalandi')
    } catch {
      toast.error("Nusxalab bo'lmadi — qo'lda yozib oling")
    }
  }

  const handleSubmitTransfer = async (e) => {
    e.preventDefault()
    if (payerCardLast4.length !== 4) {
      toast.error("Kartangizning oxirgi 4 raqamini kiriting")
      return
    }
    setProcessing(true)
    try {
      const res = await api.requestSubscription({
        tariff: selectedTariff,
        billingCycle,
        payerCardLast4,
      })
      sounds.playSuccess()
      setReceiptData(res)
      setPaymentStep(2)
      setSubscription(prev => ({
        ...prev,
        pendingPayment: { id: res.paymentId, tariff: res.tariff, amount: res.amount, reference: res.reference },
      }))
    } catch (err) {
      toast.error(err.message || "So'rov yuborilmadi")
    } finally {
      setProcessing(false)
    }
  }

  const formatPrice = (p) => new Intl.NumberFormat('ru-RU').format(p || 0) + " so'm"

  const currentTariff = subscription?.tariff || 'trial'
  const activeTariffObj = tariffs.find(t => t.key === selectedTariff) || tariffs[1]
  const payableAmount = billingCycle === 'yearly' ? activeTariffObj.totalYearly : activeTariffObj.monthlyPrice

  const paymentDetails = subscription?.paymentDetails
  const pending = subscription?.pendingPayment

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* OBUNA TO'LOVI: kartaga o'tkazma -> admin tasdig'i */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in" role="dialog" aria-modal="true">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 animate-scale-in">
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">
                    {paymentStep === 2 ? "So'rov yuborildi" : "Obuna to'lovi"}
                  </h3>
                  <p className="text-xs text-emerald-100">
                    {activeTariffObj.name} tarifi ({billingCycle === 'yearly' ? '1 yillik' : '1 oylik'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                aria-label="Yopish"
                className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {paymentStep === 1 && !paymentDetails && (
                <div className="text-center space-y-3 py-4">
                  <HelpCircle className="w-10 h-10 text-amber-500 mx-auto" />
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Onlayn to'lov hozircha sozlanmagan</p>
                  <p className="text-xs text-slate-500">Tarifni faollashtirish uchun qo'llab-quvvatlash xizmatiga yozing — admin qo'lda yoqib beradi.</p>
                </div>
              )}

              {paymentStep === 1 && paymentDetails && (
                <form onSubmit={handleSubmitTransfer} className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">To'lov miqdori</span>
                    <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{formatPrice(payableAmount)}</span>
                  </div>

                  <ol className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                    <li className="flex gap-3">
                      <span className="step-dot">1</span>
                      <div className="flex-1">
                        <p className="font-bold text-slate-800 dark:text-slate-100 mb-2">Ushbu kartaga o'tkazing (Click, Payme yoki bank ilovasi orqali):</p>
                        <div className="p-4 rounded-2xl bg-gradient-to-tr from-slate-900 via-slate-800 to-emerald-950 text-white shadow-xl relative overflow-hidden shine">
                          <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-slate-400">
                            <span>QABUL QILUVCHI</span>
                            <span>{paymentDetails.bank}</span>
                          </div>
                          <div className="text-lg sm:text-xl font-mono tracking-widest font-bold py-2">{paymentDetails.card}</div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-slate-300 uppercase">{paymentDetails.holder}</span>
                            <button type="button" onClick={copyCard} className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 transition">
                              Nusxalash
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="step-dot">2</span>
                      <div className="flex-1">
                        <label htmlFor="last4" className="block font-bold text-slate-800 dark:text-slate-100 mb-1.5">
                          Siz to'lagan kartaning oxirgi 4 raqami <span className="font-normal text-slate-400">(admin to'lovingizni shu bo'yicha topadi)</span>
                        </label>
                        <input
                          id="last4"
                          required
                          inputMode="numeric"
                          maxLength={4}
                          value={payerCardLast4}
                          onChange={e => setPayerCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="1234"
                          className="input-field font-mono font-bold text-sm tracking-[0.3em] w-32"
                        />
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="step-dot">3</span>
                      <p className="flex-1 pt-0.5">O'tkazmadan <b>keyin</b> "To'ladim" ni bosing. Admin pul tushganini ko'rgach, tarif <b>avtomatik faollashadi</b> va sizga bildirishnoma keladi.</p>
                    </li>
                  </ol>

                  <button
                    type="submit"
                    disabled={processing || Boolean(pending)}
                    className="w-full btn-primary py-3.5 text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg"
                  >
                    {processing ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : pending ? (
                      <><Clock className="w-4 h-4" /> Oldingi to'lovingiz tekshirilmoqda</>
                    ) : (
                      <><Check className="w-4 h-4" /> To'ladim — {formatPrice(payableAmount)}</>
                    )}
                  </button>
                  <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-emerald-500" /> Karta ma'lumotlaringiz bu saytda so'ralmaydi va saqlanmaydi
                  </p>
                </form>
              )}

              {paymentStep === 2 && (
                <div className="space-y-5 text-center py-2 animate-fade-in">
                  <div className="w-16 h-16 bg-amber-500 text-white rounded-full flex items-center justify-center mx-auto shadow-xl shadow-amber-500/30 animate-scale-in">
                    <Clock className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">To'lov tekshirilmoqda</h3>
                    <p className="text-xs text-slate-500 mt-1">Odatda bir necha soat ichida tasdiqlanadi.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-left text-xs space-y-2 font-mono">
                    <div className="flex justify-between"><span className="text-slate-400">Tarif:</span><span className="font-bold uppercase">{activeTariffObj.name}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Summa:</span><span className="font-bold text-emerald-600">{formatPrice(receiptData?.amount)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Referens:</span><span className="font-bold">{receiptData?.reference}</span></div>
                  </div>
                  <button onClick={() => setShowPaymentModal(false)} className="w-full btn-primary py-3 font-bold text-sm">
                    Tushunarli
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {pending && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300/60 dark:border-amber-800 flex items-center gap-3 text-sm animate-fade-in">
          <Clock className="w-5 h-5 text-amber-600 shrink-0" />
          <span className="text-amber-900 dark:text-amber-200">
            <b>{formatPrice(pending.amount)}</b> lik to'lovingiz (referens <b>{pending.reference}</b>) admin tomonidan tekshirilmoqda.
          </span>
        </div>
      )}

      {/* Header & Toggle */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center justify-center gap-2">
          Tariflar va Obuna <Crown className="w-7 h-7 text-amber-500" />
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
          Kichik biznesingizni o'stirish uchun eng qulay shaffof narxlar. Yillik to'lovda 20% arzon.
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch stagger">
        {tariffs.map(tariff => {
          const isCurrent = currentTariff === tariff.key

          return (
            <div
              key={tariff.key}
              className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 ${
                tariff.popular
                  ? 'glow-border lift bg-white dark:bg-slate-900 shadow-2xl md:scale-[1.03] z-10'
                  : 'lift bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md hover:border-emerald-300'
              }`}
            >
              {tariff.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[11px] font-extrabold px-4 py-1 rounded-full uppercase tracking-wider shadow-md">
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
                  {billingCycle === 'yearly' ? (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                          {formatPrice(tariff.totalYearly)}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">/ yil</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        <s className="text-slate-400">{formatPrice(tariff.monthlyPrice * 12)}</s>{' '}
                        <span className="text-emerald-600 font-bold">
                          {formatPrice(tariff.monthlyPrice * 12 - tariff.totalYearly)} tejaysiz (−{Math.round((1 - tariff.totalYearly / (tariff.monthlyPrice * 12)) * 100)}%)
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Oyiga {formatPrice(tariff.yearlyPrice)} ga to'g'ri keladi</p>
                    </>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                        {formatPrice(tariff.monthlyPrice)}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">/ oy</span>
                    </div>
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
                      <CreditCard className="w-4 h-4" /> Sotib olish
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
