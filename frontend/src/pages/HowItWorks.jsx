import React from 'react'
import { Link } from 'react-router-dom'
import { Check, ScanLine, Send, PackageMinus, BookOpen, BarChart3, Store, Smartphone, ScanBarcode, Printer, Wifi } from 'lucide-react'
import { PublicHeader, PublicFooter, Faq, btnPrimary, usePageTitle } from '../components/PublicChrome'
import { FEATURES } from '../content/features'

const ICONS = { ScanLine, Send, PackageMinus, BookOpen, BarChart3, Store }
const featureLink = (slug) => (slug === 'nasiya' ? '/nasiya' : `/imkoniyatlar/${slug}`)

const START = [
  ["Ro'yxatdan o'tasiz", "Ism, do'kon nomi, telefon, email va parol. Emailga kelgan kod bilan tasdiqlaysiz. 14 kunlik sinov darhol boshlanadi, karta so'ralmaydi."],
  ["Mahsulotlarni kiritasiz", "Nomi, narxi, tannarxi, soni va rasmi. Shtrix-kodi bo'lsa, uni ham yozasiz, keyin kassada skaner bilan topiladi."],
  ["Sotishni boshlaysiz", "Kassada sotasiz: chek chiqadi, qoldiq kamayadi, tushum hisobotga yoziladi. Nasiyaga bersangiz, qarz mijoz kartasiga tushadi."],
  ["Onlayn sotuvni yoqasiz", "Do'kon sozlamalarida OsonBozor vitrinasini yoqsangiz, mahsulotlaringiz OsonBozor'da va Telegram botda ko'rinadi. Buyurtmalar o'sha ro'yxatga tushadi."],
]

const DAY = [
  ['08:00', 'kassa', "Kassa ochiladi", "Shtrix-kodni skanerlaysiz yoki nomini yozasiz. Chek chiqadi, qoldiq o'zi kamayadi."],
  ['11:30', 'telegram', "Onlayn buyurtma keladi", "Mijoz Telegram botda yoki OsonBozor'da mahsulot tanlaydi. Buyurtma ro'yxatingizga tushadi."],
  ['15:10', 'ombor', "Tugayotgan mahsulot ko'rinadi", "Qoldig'i kamaygan mahsulot alohida belgilanadi. Vaqtida buyurtma qilasiz."],
  ['18:00', 'nasiya', "Nasiya qaytariladi", "Mijoz qarzining bir qismini olib keladi. Kiritasiz, qolgani o'zi hisoblanadi."],
  ['21:00', 'hisobotlar', "Kun yopiladi", "Tushum, cheklar soni va nasiya bir sahifada. Daftar bilan o'tirmaysiz."],
]

const NEEDS = [
  [Smartphone, 'Telefon, planshet yoki kompyuter', "Brauzer ochiladigan har qanday qurilma. Dastur o'rnatish shart emas."],
  [Wifi, 'Internet', "Ma'lumotlar serverda saqlanadi: telefon yo'qolsa ham hisob yo'qolmaydi."],
  [ScanBarcode, 'Shtrix-kod skaneri (ixtiyoriy)', "USB yoki Bluetooth skaner klaviatura kabi ishlaydi, sozlash kerak emas."],
  [Printer, 'Chek printeri (ixtiyoriy)', "Chek brauzer orqali chop etiladi. Printer bo'lmasa, sotuv baribir saqlanadi."],
]

const FAQ = [
  ["Bir nechta qurilmadan kirsa bo'ladimi?", "Ha. Bitta akkauntga telefon va kompyuterdan kirasiz, ma'lumotlar bir xil ko'rinadi."],
  ['Ilova qaysi tillarda?', "Menyu va asosiy yozuvlar o'zbek, rus va ingliz tilida."],
  ["Parolni unutsam nima bo'ladi?", "Kirish sahifasida \"Parolni unutdingizmi?\" tugmasi bor: emailga kod keladi va yangi parol qo'yasiz."],
  ['Sinov tugasa nima bo\'ladi?', "Ma'lumotlaringiz o'chirilmaydi. Tarif to'langach, qolgan joyidan davom etasiz."],
]

export default function HowItWorks() {
  usePageTitle('Qanday ishlaydi — OsonBiznes')
  return (
    <div className="min-h-screen bg-white text-[#0F172A]">
      <PublicHeader />

      <section className="auth-light relative overflow-hidden">
        <span className="auth-blob auth-blob-a" aria-hidden="true" />
        <span className="auth-blob auth-blob-b" aria-hidden="true" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-14 lg:py-20">
          <h1 className="font-display font-bold text-3xl sm:text-5xl leading-[1.1] max-w-3xl">Ro'yxatdan o'tgandan birinchi sotuvgacha 10 daqiqa</h1>
          <p className="mt-5 text-lg text-[#475569] leading-relaxed max-w-2xl">
            OsonBiznes do'kon daftarining o'rnini bosadi: kassa, ombor, nasiya, Telegram buyurtmalar va onlayn vitrina bitta ilovada. Siz sotasiz, hisobni ilova yuritadi.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/login?register=1" className={`${btnPrimary} px-6 py-3.5`}>14 kun bepul sinash</Link>
            <Link to="/narxlar" className="inline-flex items-center rounded-xl border border-[#CBD5E1] bg-white px-6 py-3.5 font-semibold hover:border-[#047857]">Narxlarni ko'rish</Link>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 lg:py-20">
        <h2 className="font-display font-bold text-2xl sm:text-3xl">Qanday boshlanadi</h2>
        <ol className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {START.map(([t, d], i) => (
            <li key={t} className="relative pl-12">
              <span className="absolute left-0 top-0 w-9 h-9 rounded-full grid place-items-center font-bold text-[#047857] bg-[#D1FAE5]">{i + 1}</span>
              <h3 className="font-bold">{t}</h3>
              <p className="mt-1.5 text-[#475569] text-[0.9375rem] leading-relaxed">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-[#F8FAFC] border-y border-[#E2E8F0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 lg:py-20">
          <h2 className="font-display font-bold text-2xl sm:text-3xl">Do'kondagi bir kun</h2>
          <p className="mt-3 text-[#64748B] max-w-xl">Ertalabdan kechgacha nima o'zi bo'ladi, siz nima qilasiz.</p>
          <ol className="mt-10 border-l-2 border-[#A7F3D0] ml-2 space-y-8">
            {DAY.map(([time, slug, t, d]) => (
              <li key={time} className="relative pl-6 sm:pl-8">
                <span className="absolute -left-[0.4rem] top-1.5 w-3 h-3 rounded-full bg-[#10B981] ring-4 ring-[#F8FAFC]" aria-hidden="true" />
                <p className="font-display font-bold text-[#047857]">{time}</p>
                <h3 className="mt-1 text-lg font-bold">{t}</h3>
                <p className="mt-1 text-[#475569] leading-relaxed max-w-xl">{d}</p>
                <Link to={featureLink(slug)} className="mt-2 inline-block text-sm font-semibold text-[#047857] hover:underline">Batafsil</Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 lg:py-20">
        <h2 className="font-display font-bold text-2xl sm:text-3xl">Imkoniyatlar</h2>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => {
            const I = ICONS[f.icon] || Check
            return (
              <Link key={f.slug} to={featureLink(f.slug)} className="group rounded-2xl border border-[#E2E8F0] p-5 hover:border-[#10B981] transition">
                <span className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: f.tint }}>
                  <I className="w-5 h-5 text-[#047857]" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-bold text-lg">{f.name}</h3>
                <p className="mt-1.5 text-[#475569] text-[0.9375rem] leading-relaxed line-clamp-3">{f.lead}</p>
                <span className="mt-3 inline-block text-sm font-semibold text-[#047857] group-hover:underline">Batafsil</span>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="bg-[#F8FAFC] border-y border-[#E2E8F0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <h2 className="font-display font-bold text-2xl sm:text-3xl">Nima kerak</h2>
          <ul className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {NEEDS.map(([I, t, d]) => (
              <li key={t}>
                <I className="w-6 h-6 text-[#10B981]" aria-hidden="true" />
                <h3 className="mt-3 font-bold">{t}</h3>
                <p className="mt-1 text-[#475569] text-[0.9375rem] leading-relaxed">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="font-display font-bold text-2xl sm:text-3xl">Ko'p so'raladigan savollar</h2>
        <Faq items={FAQ} />
      </section>

      <PublicFooter />
    </div>
  )
}
