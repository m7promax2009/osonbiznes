import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import api from '../services/api'
import { PublicHeader, PublicFooter, Faq, btnPrimary, usePageTitle } from '../components/PublicChrome'

const fmt = (n) => new Intl.NumberFormat('ru-RU').format(n || 0)

// backend/src/config/planLimits.js bilan bir xil bo'lishi shart
const LIMITS = [
  ['Mahsulotlar', '500 tagacha', 'Cheksiz', 'Cheksiz'],
  ['Mijozlar', '300 tagacha', 'Cheksiz', 'Cheksiz'],
]

const PAY_STEPS = [
  ['Tarifni tanlaysiz', "Ilovadagi \"Obuna\" bo'limida tarif va davrni (oylik yoki yillik) tanlaysiz."],
  ["Kartaga o'tkazasiz", "Ilovada ko'rsatilgan karta raqamiga istalgan bank ilovasidan pul o'tkazasiz."],
  ["So'rov yuborasiz", "To'lagan kartangizning oxirgi 4 raqamini kiritib, to'lov so'rovini yuborasiz."],
  ['Tarif faollashadi', "To'lov tekshirilgach tarif yoqiladi. Obunangiz bo'lsa, muddat uning ustiga qo'shiladi."],
]

const FAQ = [
  ['Sinov uchun karta kerakmi?', "Yo'q. 14 kun barcha imkoniyatlar bilan bepul, hech qanday to'lov ma'lumoti so'ralmaydi."],
  ['Pul avtomatik yechiladimi?', "Yo'q. Har safar o'zingiz to'laysiz. Avtomatik yechish yo'q."],
  ["Sinov tugasa ma'lumotlarim nima bo'ladi?", "O'chirilmaydi. Tarif to'langach, qolgan joyidan davom etasiz."],
  ["Tarifni keyin o'zgartirsa bo'ladimi?", "Ha. Obuna bo'limidan boshqa tarifga so'rov yuborasiz."],
  ['Yillik to\'lov qancha arzon?', "Yillik tarif oylikka qaraganda taxminan 20% arzon: 12 oy uchun bir martada to'laysiz."],
]

export default function Pricing() {
  usePageTitle('Narxlar — OsonBiznes')
  const [plans, setPlans] = useState(null)
  const [error, setError] = useState(false)
  const [yearly, setYearly] = useState(false)

  useEffect(() => {
    let alive = true
    api
      .request('/subscription/plans')
      .then((r) => alive && (r?.data ? setPlans(r.data) : setError(true)))
      .catch(() => alive && setError(true))
    return () => { alive = false }
  }, [])

  const trialDays = plans?.trialDays || 14

  return (
    <div className="min-h-screen bg-white text-[#0F172A]">
      <PublicHeader />

      <section className="auth-light relative overflow-hidden">
        <span className="auth-blob auth-blob-a" aria-hidden="true" />
        <span className="auth-blob auth-blob-b" aria-hidden="true" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-10 lg:pt-20 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <h1 className="font-display font-bold text-3xl sm:text-5xl leading-[1.1]">Narxlar</h1>
            <p className="mt-4 text-lg text-[#475569] max-w-xl">Har qanday tarifni {trialDays} kun bepul sinab ko'ring. Karta so'ralmaydi, avtomatik yechib olinmaydi.</p>
          </div>
          <div role="radiogroup" aria-label="To'lov davri" className="self-start sm:self-auto inline-flex p-1 rounded-full bg-white/80 border border-[#E2E8F0] text-sm font-semibold">
            {[[false, 'Oylik'], [true, 'Yillik −20%']].map(([val, label]) => (
              <button key={label} type="button" role="radio" aria-checked={yearly === val} onClick={() => setYearly(val)}
                className={`px-4 py-2 rounded-full transition-colors ${yearly === val ? 'bg-[#047857] text-white' : 'text-[#475569] hover:text-[#0F172A]'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-16">
        <div className="grid md:grid-cols-3 gap-5 items-stretch">
          {(plans?.plans || []).map((p) => {
            const featured = p.key === 'pro'
            const price = yearly ? Math.round(p.yearly / 12) : p.monthly
            return (
              <div key={p.key} className={`flex flex-col p-7 ${featured ? 'bg-[#ECFDF5] rounded-3xl border-2 border-[#10B981]' : 'bg-white rounded-2xl border border-[#E2E8F0]'}`}>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display font-bold text-xl">{p.name}</h2>
                  {featured && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#047857] text-white whitespace-nowrap">Ko'pchilik tanlaydi</span>}
                </div>
                <p className="mt-5 flex items-baseline flex-wrap gap-x-1.5">
                  <span className="font-display font-extrabold text-4xl">{fmt(price)}</span>
                  <span className="text-[#64748B]">so'm/oy</span>
                </p>
                <p className="text-sm mt-1 h-5 text-[#64748B]">{yearly ? `Yiliga ${fmt(p.yearly)} so'm bir martada` : ''}</p>
                <ul className="mt-6 space-y-2.5 text-[0.9375rem] mb-8">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2.5"><Check className="w-4 h-4 shrink-0 mt-1 text-[#10B981]" aria-hidden="true" />{f}</li>
                  ))}
                </ul>
                <Link to="/login?register=1" className={`mt-auto block text-center py-3.5 rounded-full font-bold ${featured ? 'bg-[#047857] text-white hover:bg-[#065F46]' : 'bg-white text-[#047857] border-2 border-[#10B981]/60 hover:bg-[#ECFDF5]'}`}>
                  {trialDays} kun bepul sinash
                </Link>
              </div>
            )
          })}
          {!plans && !error && <p className="text-[#64748B]">Narxlar yuklanmoqda…</p>}
          {error && <p className="text-[#C2410C]">Narxlarni yuklab bo'lmadi. Sahifani yangilang.</p>}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <h2 className="font-display font-bold text-2xl sm:text-3xl">Cheklovlar</h2>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-[#E2E8F0]">
          <table className="w-full min-w-[32rem] text-left text-[0.9375rem]">
            <thead className="bg-[#F8FAFC] text-[#475569]">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold" />
                {['Start', 'Pro', 'Biznes'].map((n) => <th key={n} scope="col" className="px-5 py-3 font-semibold">{n}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {LIMITS.map(([k, ...v]) => (
                <tr key={k}>
                  <th scope="row" className="px-5 py-3 font-semibold">{k}</th>
                  {v.map((x, i) => <td key={i} className="px-5 py-3">{x}</td>)}
                </tr>
              ))}
              <tr>
                <th scope="row" className="px-5 py-3 font-semibold">OsonBozor vitrinasi</th>
                {[0, 1, 2].map((i) => <td key={i} className="px-5 py-3"><Check className="w-4 h-4 text-[#10B981]" aria-label="bor" /></td>)}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-[#64748B]">Sinov davrida: 200 tagacha mahsulot va 500 tagacha mijoz.</p>
      </section>

      <section className="bg-[#F8FAFC] border-y border-[#E2E8F0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <h2 className="font-display font-bold text-2xl sm:text-3xl">Qanday to'lanadi</h2>
          <ol className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PAY_STEPS.map(([t, d], i) => (
              <li key={t} className="relative pl-12">
                <span className="absolute left-0 top-0 w-9 h-9 rounded-full grid place-items-center font-bold text-[#047857] bg-[#D1FAE5]">{i + 1}</span>
                <h3 className="font-bold">{t}</h3>
                <p className="mt-1.5 text-[#475569] text-[0.9375rem] leading-relaxed">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="font-display font-bold text-2xl sm:text-3xl">Ko'p so'raladigan savollar</h2>
        <Faq items={FAQ} />
      </section>

      <PublicFooter title="Avval sinab ko'ring, keyin tanlang." />
    </div>
  )
}
