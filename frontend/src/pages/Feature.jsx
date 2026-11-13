import React, { useEffect } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Check, ScanLine, Send, PackageMinus, BookOpen, BarChart3, Store, ArrowLeft } from 'lucide-react'
import { PublicHeader, PublicFooter, Faq, btnPrimary } from '../components/PublicChrome'
import { FEATURES, featureBySlug } from '../content/features'

const ICONS = { ScanLine, Send, PackageMinus, BookOpen, BarChart3, Store }

function Demo({ kind }) {
  const row = 'flex justify-between gap-4'
  switch (kind) {
    case 'receipt':
      return (
        <div className="font-mono text-sm text-[#1E293B] space-y-1.5">
          <p className="text-center text-xs text-[#64748B] pb-2 border-b border-dashed border-[#94A3B8]">MALIKA MOBILE · 214-do'kon</p>
          <div className={row}><span>iPhone 15 128GB</span><span>11 900 000</span></div>
          <div className={row}><span>G'ilof + oyna</span><span>85 000</span></div>
          <div className={`${row} font-semibold border-t border-dashed border-[#94A3B8] pt-1.5`}><span>Jami</span><span>11 985 000</span></div>
          <p className="text-xs text-[#047857] pt-1">To'lov: karta (Humo) · qoldiq yangilandi</p>
        </div>
      )
    case 'chat':
      return (
        <div className="space-y-2 text-sm">
          <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-[#2AABEE] text-white px-3 py-2">Casio soatning qora rangi bormi? Chilonzorga yetkazasizmi?</div>
          <div className="w-fit max-w-[85%] rounded-2xl rounded-bl-md bg-white border border-[#E2E8F0] px-3 py-2 text-[#1E293B]">Bor. Buyurtma #218 qabul qilindi: 690 000 so'm.</div>
        </div>
      )
    case 'stock':
      return (
        <div className="space-y-2 text-sm">
          {[['AirPods Pro 2', 3, true], ['Samsung Galaxy A55', 12, false], ['JBL Tune 770NC', 2, true]].map(([n, q, low]) => (
            <div key={n} className={`flex items-center justify-between rounded-xl px-3 py-2 border ${low ? 'bg-[#FFF7ED] border-[#FED7AA] text-[#C2410C]' : 'bg-white border-[#E2E8F0] text-[#1E293B]'}`}>
              <span>{n}</span><span className="font-semibold">{q} ta{low ? ' · kam qoldi' : ''}</span>
            </div>
          ))}
        </div>
      )
    case 'ledger':
      return (
        <div className="text-sm space-y-2">
          {[['Aziz aka', '1 200 000', '12-noy', false], ['Nodira opa', '450 000', 'muddati o\'tdi', true], ['Sherzod', '750 000', '20-noy', false]].map(([n, s, d, late]) => (
            <div key={n} className="flex justify-between border-b border-[#E2E8F0] pb-1.5 text-[#1E293B]">
              <span>{n}</span>
              <span>{s} <span className={late ? 'text-[#B4231B] font-semibold' : 'text-[#64748B]'}>· {d}</span></span>
            </div>
          ))}
        </div>
      )
    case 'stats':
      return (
        <div className="grid grid-cols-3 gap-2 text-center">
          {[['Tushum', '18 640 000'], ['Cheklar', '23'], ['Nasiya', '+2 400 000']].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-white border border-[#E2E8F0] py-3 px-1">
              <p className="font-bold text-[#0F172A] text-sm sm:text-base">{v}</p>
              <p className="text-xs text-[#64748B] mt-0.5">{k}</p>
            </div>
          ))}
        </div>
      )
    default:
      return (
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[['Smartfonlar', '#D1FAE5'], ['Soatlar', '#E0F2FE'], ['Parfyumeriya', '#FCE7F3'], ['Poyabzal', '#FEF3C7']].map(([n, c]) => (
            <div key={n} className="rounded-xl px-3 py-4 font-semibold text-[#0F172A]" style={{ background: c }}>{n}</div>
          ))}
        </div>
      )
  }
}

export default function Feature({ slug: fixedSlug }) {
  const params = useParams()
  const slug = fixedSlug || params.slug
  const f = featureBySlug(slug)

  useEffect(() => {
    if (!f) return
    window.scrollTo(0, 0)
    document.title = `${f.name} — OsonBiznes`
  }, [f])

  if (!f) return <Navigate to="/" replace />
  const Icon = ICONS[f.icon] || Check
  const others = FEATURES.filter((x) => x.slug !== f.slug)

  return (
    <div className="min-h-screen bg-white text-[#0F172A]">
      <PublicHeader />

      <section className="auth-light relative overflow-hidden">
        <span className="auth-blob auth-blob-a" aria-hidden="true" />
        <span className="auth-blob auth-blob-b" aria-hidden="true" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-14 lg:py-20 grid lg:grid-cols-[1.1fr_1fr] gap-10 items-center">
          <div>
            <Link to="/qanday-ishlaydi" className="inline-flex items-center gap-1.5 text-sm text-[#475569] hover:text-[#047857]">
              <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Barcha imkoniyatlar
            </Link>
            <p className="mt-6 flex w-fit items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold text-[#047857]" style={{ background: f.tint }}>
              <Icon className="w-4 h-4" aria-hidden="true" /> {f.name}
            </p>
            <h1 className="mt-4 font-display font-bold text-3xl sm:text-5xl leading-[1.1] max-w-xl">{f.title}</h1>
            <p className="mt-5 text-lg text-[#475569] leading-relaxed max-w-xl">{f.lead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login?register=1" className={`${btnPrimary} px-6 py-3.5`}>14 kun bepul sinash</Link>
              {f.slug === 'osonbozor' && (
                <Link to="/marketplace" className="inline-flex items-center rounded-xl border border-[#CBD5E1] bg-white px-6 py-3.5 font-semibold hover:border-[#047857]">OsonBozor'ni ko'rish</Link>
              )}
            </div>
          </div>
          <div className="rounded-3xl bg-white/80 border border-white shadow-[0_24px_48px_-28px_rgba(15,23,42,.35)] p-5 sm:p-6">
            <Demo kind={f.demo} />
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 lg:py-20">
        <h2 className="font-display font-bold text-2xl sm:text-3xl">Qanday ishlaydi</h2>
        <ol className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {f.steps.map(([t, d], i) => (
            <li key={t} className="relative pl-12">
              <span className="absolute left-0 top-0 w-9 h-9 rounded-full grid place-items-center font-bold text-[#047857]" style={{ background: f.tint }}>{i + 1}</span>
              <h3 className="font-bold">{t}</h3>
              <p className="mt-1.5 text-[#475569] text-[0.9375rem] leading-relaxed">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-[#F8FAFC] border-y border-[#E2E8F0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="font-display font-bold text-2xl">Nimalar bor</h2>
            <ul className="mt-6 space-y-3">
              {f.points.map((t) => (
                <li key={t} className="flex gap-3">
                  <Check className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5" aria-hidden="true" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-display font-bold text-2xl">Kimga mos</h2>
            <ul className="mt-6 flex flex-wrap gap-2">
              {f.fits.map((t) => (
                <li key={t} className="rounded-full bg-white border border-[#E2E8F0] px-4 py-2 text-[0.9375rem]">{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="font-display font-bold text-2xl sm:text-3xl">Ko'p so'raladigan savollar</h2>
        <Faq items={f.faq} />
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <h2 className="font-display font-bold text-2xl">Boshqa imkoniyatlar</h2>
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-5 gap-3">
          {others.map((o) => {
            const OI = ICONS[o.icon] || Check
            return (
              <Link key={o.slug} to={o.slug === 'nasiya' ? '/nasiya' : `/imkoniyatlar/${o.slug}`} className="rounded-2xl border border-[#E2E8F0] p-4 hover:border-[#10B981] transition">
                <span className="w-9 h-9 rounded-xl grid place-items-center" style={{ background: o.tint }}>
                  <OI className="w-5 h-5 text-[#047857]" aria-hidden="true" />
                </span>
                <p className="mt-3 font-semibold">{o.name}</p>
              </Link>
            )
          })}
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
