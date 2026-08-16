import React, { useState } from 'react'
import { Sparkles, X, Star, ChevronRight, Wand2 } from 'lucide-react'
import { formatSom } from '../utils/booking'

// AI stil maslahatchi — mijozning xohishiga qarab eng mos sartaroshni tavsiya qiladi.
// (Reyting, skill mosligi va narxni tahlil qiluvchi algoritm — demo uchun "AI" ko'rinishida.)
const STYLES = [
  { key: 'Fade', emoji: '💈', label: 'Fade / zamonaviy', match: ['Fade', 'Andagunt'] },
  { key: 'Klassik', emoji: '✂️', label: 'Klassik', match: ['Klassik'] },
  { key: 'Soqol', emoji: '🧔', label: 'Soqol / parvarish', match: ['Soqol', 'Styling'] },
  { key: 'Bola', emoji: '🧒', label: 'Bolalar sochi', match: ['Bolalar sochi'] },
  { key: 'any', emoji: '🤷', label: 'Bilmayman, tavsiya bering', match: [] },
]

export default function AIAdvisor({ barbers = [], onClose, onPick }) {
  const [step, setStep] = useState('style') // style → budget → thinking → result
  const [style, setStyle] = useState(null)
  const [budget, setBudget] = useState(null)
  const [recs, setRecs] = useState([])

  const run = (styleObj, budgetChoice) => {
    setStep('thinking')
    // Ballash: skill mosligi (asosiy) + reyting + narx (agar arzon muhim bo'lsa)
    const scored = barbers.map(b => {
      let score = (b.rating || 4) * 10
      const skills = b.skills || []
      if (styleObj.match.length) {
        const hit = styleObj.match.some(m => skills.some(s => s.toLowerCase().includes(m.toLowerCase())))
        score += hit ? 40 : 0
      }
      if (budgetChoice === 'cheap') score -= (b.priceFrom || 0) / 20000
      score += (b.reviewCount || 0) / 100
      return { ...b, _score: score }
    }).sort((a, b) => b._score - a._score)
    setTimeout(() => { setRecs(scored.slice(0, 2)); setStep('result') }, 1100)
  }

  const reasons = (b) => {
    const r = []
    if (b.rating >= 4.8) r.push(`Yuqori reyting ⭐${b.rating} (${b.reviewCount} sharh)`)
    if (style && style.match.some(m => (b.skills || []).some(s => s.toLowerCase().includes(m.toLowerCase())))) r.push(`${style.label} bo'yicha usta`)
    if (budget === 'cheap' && b.priceFrom) r.push(`Hamyonbop — ${formatSom(b.priceFrom)} dan`)
    r.push(`${b.salonName} · ${b.branchName}`)
    return r
  }

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center"><Wand2 className="w-5 h-5" /></div>
          <div className="flex-1"><p className="font-extrabold">AI stil maslahatchi</p><p className="text-xs text-indigo-100">Sizga eng mos sartaroshni topaman</p></div>
          <button onClick={onClose} className="p-1 text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5">
          {step === 'style' && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-sm font-semibold text-slate-700">Qanday natija xohlaysiz?</p>
              <div className="grid grid-cols-1 gap-2">
                {STYLES.map(s => (
                  <button key={s.key} onClick={() => { setStyle(s); setStep('budget') }} className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-left transition">
                    <span className="text-2xl">{s.emoji}</span>
                    <span className="text-sm font-bold text-slate-800 flex-1">{s.label}</span>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'budget' && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-sm font-semibold text-slate-700">Narx siz uchun muhimmi?</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setBudget('cheap'); run(style, 'cheap') }} className="p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 font-bold text-sm text-slate-800">💰 Hamyonbop bo'lsin</button>
                <button onClick={() => { setBudget('quality'); run(style, 'quality') }} className="p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 font-bold text-sm text-slate-800">✨ Sifat muhim</button>
              </div>
            </div>
          )}

          {step === 'thinking' && (
            <div className="py-10 text-center animate-fade-in">
              <div className="inline-flex items-center gap-2 text-indigo-600"><Sparkles className="w-5 h-5 animate-pulse" /> <span className="font-bold">Eng mos ustani tanlayapman...</span></div>
              <div className="mt-4 flex justify-center gap-1">
                {[0, 1, 2].map(i => <span key={i} className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
              </div>
            </div>
          )}

          {step === 'result' && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-indigo-500" /> Sizga tavsiyam:</p>
              {recs.map((b, i) => (
                <div key={b._id} className={`rounded-2xl border p-4 ${i === 0 ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-200'}`}>
                  {i === 0 && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">ENG MOS</span>}
                  <div className="flex items-center gap-3 mt-2">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center text-2xl">{b.avatar || '💈'}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-slate-900">{b.name} <span className="text-amber-500 text-sm inline-flex items-center gap-0.5"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />{b.rating}</span></p>
                      <p className="text-xs text-slate-500">{(b.skills || []).join(' · ')}</p>
                    </div>
                  </div>
                  <ul className="mt-3 space-y-1">
                    {reasons(b).map((r, j) => <li key={j} className="text-xs text-slate-600 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-indigo-400" />{r}</li>)}
                  </ul>
                  <button onClick={() => { onPick(b); onClose() }} className="w-full mt-3 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 flex items-center justify-center gap-1">Band qilish <ChevronRight className="w-4 h-4" /></button>
                </div>
              ))}
              <button onClick={() => { setStep('style'); setStyle(null); setBudget(null) }} className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-600">↺ Qaytadan</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
