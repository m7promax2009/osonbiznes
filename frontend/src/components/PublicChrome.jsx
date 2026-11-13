import React, { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import BrandMark from './BrandMark'

export const btnPrimary =
  'inline-flex items-center justify-center rounded-xl bg-[#047857] hover:bg-[#065F46] text-white font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:ring-offset-2'

export const PUBLIC_NAV = [
  ['/qanday-ishlaydi', 'Qanday ishlaydi'],
  ['/nasiya', 'Nasiya'],
  ['/narxlar', 'Narxlar'],
  ['/marketplace', 'OsonBozor'],
]

const navCls = ({ isActive }) =>
  `px-3 py-2 rounded-lg transition-colors ${isActive ? 'text-[#047857] bg-[#ECFDF5]' : 'text-[#334155] hover:text-[#047857]'}`

export function PublicHeader() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-[#E2E8F0]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-6">
        <Link to="/" aria-label="OsonBiznes bosh sahifa" className="shrink-0"><BrandMark compact /></Link>
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium" aria-label="Bo'limlar">
          {PUBLIC_NAV.map(([to, label]) => <NavLink key={to} to={to} className={navCls}>{label}</NavLink>)}
        </nav>
        <div className="ml-auto flex items-center gap-2 text-sm font-medium">
          <Link to="/login" className="hidden sm:inline px-3 py-2 text-[#334155] hover:text-[#047857]">Kirish</Link>
          <Link to="/login?register=1" className={`${btnPrimary} px-4 py-2 text-sm`}>Bepul boshlash</Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Menyuni yopish' : 'Menyu'}
            className="md:hidden p-2 -mr-2 rounded-lg text-[#0F172A] hover:bg-[#F1F5F9]"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="md:hidden border-t border-[#E2E8F0] bg-white px-4 py-3 flex flex-col text-base font-medium" aria-label="Bo'limlar">
          {PUBLIC_NAV.map(([to, label]) => <NavLink key={to} to={to} className={navCls}>{label}</NavLink>)}
          <Link to="/login" className="px-3 py-2 text-[#334155]">Kirish</Link>
        </nav>
      )}
    </header>
  )
}

export function PublicFooter({ title = 'Hammasi bitta ilovada: kassa, ombor, nasiya, Telegram va OsonBozor.' }) {
  return (
    <footer className="bg-[#ECFDF5] border-t border-[#A7F3D0] text-[#0F172A]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <p className="font-display font-bold text-2xl sm:text-3xl max-w-lg leading-tight">{title}</p>
          <Link to="/login?register=1" className={`${btnPrimary} self-start px-7 py-4`}>14 kun bepul sinash</Link>
        </div>
        <div className="mt-10 pt-6 border-t border-[#A7F3D0] flex flex-col sm:flex-row justify-between gap-4 text-sm text-[#475569]">
          <p>© {new Date().getFullYear()} OsonBiznes, Toshkent</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {PUBLIC_NAV.map(([to, label]) => <Link key={to} to={to} className="hover:text-[#047857]">{label}</Link>)}
            <Link to="/login" className="hover:text-[#047857]">Kirish</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export function Faq({ items }) {
  return (
    <div className="mt-6 divide-y divide-[#E2E8F0] border-y border-[#E2E8F0]">
      {items.map(([q, a]) => (
        <details key={q} className="group py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
            {q}
            <span aria-hidden="true" className="text-[#64748B] text-xl leading-none transition group-open:rotate-45">+</span>
          </summary>
          <p className="mt-2 text-[#475569] leading-relaxed">{a}</p>
        </details>
      ))}
    </div>
  )
}

export function usePageTitle(title) {
  useEffect(() => {
    window.scrollTo(0, 0)
    document.title = title
  }, [title])
}
