import React, { useState, useEffect, useRef } from 'react'
import {
  Sparkles,
  Bot,
  X,
  Send,
  TrendingUp,
  Package,
  Users,
  CreditCard,
  Zap,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  Lightbulb,
} from 'lucide-react'
import api from '../services/api'
import sounds from '../utils/audio'

export default function AIAdvisor() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Assalomu alaykum! Men sizning **OsonBiznes AI Maslahatchi**ngizman. Do'koningiz savdosini tahlil qilish, ombordagi kam qolgan tovarlarni aniqlash yoki nasiya qarzlarini yig'ish bo'yicha yordam berishga tayyorman!",
      suggestions: [
        "Bugungi tushum va savdo tahlili",
        "Omborda kam qolgan tovarlar",
        "Nasiya qarzlarini yig'ish bo'yicha tavsiya",
        "Daromadni 30% oshirish sirlari",
      ],
      time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [metrics, setMetrics] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  const toggleOpen = () => {
    sounds.playClick()
    setIsOpen(!isOpen)
  }

  const handleSend = async (textToSend = null, contextType = 'general') => {
    const text = (textToSend || inputText).trim()
    if (!text || loading) return

    sounds.playClick()
    const userMsg = {
      id: String(Date.now()),
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages(prev => [...prev, userMsg])
    setInputText('')
    setLoading(true)

    try {
      const data = await api.getAiAdvice(text, contextType)
      sounds.playSuccess()
      const aiMsg = {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: data?.reply || "Savolingiz qabul qilindi. Do'koningiz tahlil qilinmoqda...",
        suggestions: data?.suggestions || [],
        time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages(prev => [...prev, aiMsg])
      if (data?.metrics) {
        setMetrics(data.metrics)
      }
    } catch (err) {
      const errorMsg = {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: "Kechirasiz, ma'lumotlarni yuklashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
        time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (p) => new Intl.NumberFormat('uz-UZ').format(p || 0) + " so'm"

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={toggleOpen}
        aria-label="AI Maslahatchi"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600 text-white rounded-full shadow-2xl shadow-purple-500/40 hover:scale-105 active:scale-95 transition-all duration-200 group"
      >
        <div className="relative">
          <Sparkles className="w-5 h-5 animate-pulse" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
        </div>
        <span className="text-sm font-bold tracking-wide hidden sm:inline">AI Maslahatchi</span>
      </button>

      {/* Slide-over / Modal Chat Window */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:p-6 pointer-events-none animate-fade-in">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs pointer-events-auto sm:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div className="pointer-events-auto w-full sm:w-[440px] h-[85vh] sm:h-[620px] bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600 text-white flex items-center justify-between shadow-md shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm flex items-center gap-1.5">
                    OsonBiznes AI Advisor
                    <span className="text-[10px] bg-emerald-400/30 text-emerald-100 font-mono px-1.5 py-0.5 rounded-full">LIVE</span>
                  </h3>
                  <p className="text-[11px] text-purple-100/80">Sun'iy intellekt biznes konsultanti</p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics Bar (if loaded) */}
            {metrics && (
              <div className="grid grid-cols-3 gap-1 p-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                <div className="text-center">
                  <span className="text-emerald-600 font-bold block">{formatPrice(metrics.totalRevenue)}</span>
                  <span className="text-[9px] text-slate-400 uppercase">Tushum</span>
                </div>
                <div className="text-center border-x border-slate-200 dark:border-slate-700">
                  <span className="text-rose-600 font-bold block">{metrics.lowStockCount} ta</span>
                  <span className="text-[9px] text-slate-400 uppercase">Kam zaxira</span>
                </div>
                <div className="text-center">
                  <span className="text-amber-600 font-bold block">{formatPrice(metrics.totalDebt)}</span>
                  <span className="text-[9px] text-slate-400 uppercase">Nasiya</span>
                </div>
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-sm">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl ${
                      msg.sender === 'user'
                        ? 'bg-purple-600 text-white rounded-br-xs shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-xs border border-slate-200/60 dark:border-slate-700'
                    }`}
                  >
                    <p className="whitespace-pre-line text-xs sm:text-sm leading-relaxed">{msg.text}</p>

                    {/* Suggestions Buttons inside AI message */}
                    {msg.suggestions?.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-700 space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Lightbulb className="w-3 h-3 text-amber-500" /> Tavsiya etilgan savollar:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.suggestions.map((sug, sIdx) => (
                            <button
                              key={sIdx}
                              onClick={() => handleSend(sug)}
                              className="text-left text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-purple-400 text-purple-700 dark:text-purple-300 transition"
                            >
                              {sug}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 px-1">{msg.time}</span>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-slate-400 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl w-fit">
                  <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  AI do'kon ma'lumotlarini tahlil qilmoqda...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form
              onSubmit={e => {
                e.preventDefault()
                handleSend()
              }}
              className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Savolingizni yozing (masalan: Tushum qanday?)..."
                className="input-field text-xs flex-1 !py-2.5"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || loading}
                className="p-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-40 transition shrink-0 shadow-md"
                aria-label="Xabar yuborish"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
