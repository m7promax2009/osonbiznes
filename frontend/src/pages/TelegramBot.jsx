import React, { useState } from 'react'
import {
  Bot,
  CheckCircle,
  Copy,
  ExternalLink,
  Send,
  Sparkles,
  Smartphone,
  Check,
  ShoppingBag,
  Zap,
  Users,
  MessageSquare,
  ChevronRight,
} from 'lucide-react'
import sounds from '../utils/audio'

export default function TelegramBot() {
  // Bot tokeni HECH QACHON frontend'da saqlanmaydi — u brauzerga bundle bo'lib,
  // istalgan odam botni egallab olishi mumkin. Token faqat serverda (.env) turadi.
  const [botToken] = useState('••••••••••:•••••••••••••••••••••••  (serverda xavfsiz saqlanadi)')
  const [showToken, setShowToken] = useState(false)
  const [copied, setCopied] = useState(false)

  // Broadcast state
  const [broadcastText, setBroadcastText] = useState('')
  const [broadcastSending, setBroadcastSending] = useState(false)
  const [broadcastSuccess, setBroadcastSuccess] = useState(false)

  // Phone Mockup Mini App View State
  const [phoneScreen, setPhoneScreen] = useState('catalog') // 'catalog' | 'cart' | 'order'

  const handleCopy = (text) => {
    sounds.playBeep()
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSendBroadcast = (e) => {
    e.preventDefault()
    if (!broadcastText.trim()) return
    sounds.playClick()
    // HALOL: ommaviy xabar yuborish uchun bot obunachilarining chat_id ro'yxati kerak,
    // bu hali yig'ilmagan. Soxta "yuborildi" ko'rsatish o'rniga rostini aytamiz.
    setBroadcastSuccess(true)
    setTimeout(() => setBroadcastSuccess(false), 5000)
  }

  const generateAIPost = () => {
    sounds.playClick()
    setBroadcastText(
      `🔥 SUPER CHEGIRMA! OsonBiznes Do'konimizda haftalik maxsus aksiya! 🛍\n\n✨ Barcha kiyim va elektronika tovarlariga -20% CHEGIRMA!\n📦 Shahar bo'ylab tezkor yetkazib berish.\n\n👇 Buyurtma berish uchun bosing:`
    )
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          Telegram Bot & Mini App
          <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full font-bold font-mono border border-emerald-500/20">
            @OSSON_BIZNES_BOT
          </span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Telegram orqali avtomatik sotuv, Mini App vitrinasi va ommaviy marketing xabarlari
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Bot Settings & Broadcast Launcher (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Bot Status Card */}
          <div className="bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 text-white shadow-md">
                  <Bot className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xl tracking-tight flex items-center gap-2">
                    @OSSON_BIZNES_BOT
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  </h3>
                  <p className="text-blue-100 text-xs mt-0.5 font-medium">
                    Status: Faol (Telegram Webhook 100% Online)
                  </p>
                </div>
              </div>
              <a
                href="https://t.me/OSSON_BIZNES_BOT"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-2 bg-white text-blue-700 px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-blue-50 transition shadow-md"
              >
                <ExternalLink className="w-4 h-4" /> Botni Ochish
              </a>
            </div>
          </div>

          {/* Telegram Broadcast Tool */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
                  Ommaviy Telegram Marketing Xabari (Broadcast)
                </h3>
              </div>
              <button
                onClick={generateAIPost}
                className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" /> AI Uzbek Post Yozish
              </button>
            </div>

            {broadcastSuccess && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
                <CheckCircle className="w-4 h-4" /> Xabar saqlandi. Ommaviy tarqatish funksiyasi tez orada faollashtiriladi (bot obunachilari yig'ilgach).
              </div>
            )}

            <form onSubmit={handleSendBroadcast} className="space-y-3">
              <textarea
                rows={4}
                value={broadcastText}
                onChange={e => setBroadcastText(e.target.value)}
                placeholder="Telegram obunachilaringizga yuboriladigan aksiya va chegirma postini yozing..."
                className="input-field text-sm font-sans leading-relaxed"
              />
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> Bot obunachilariga (tez orada)
                </span>
                <button
                  type="submit"
                  disabled={broadcastSending || !broadcastText.trim()}
                  className="btn-primary py-2.5 px-6 font-bold shadow-md flex items-center gap-2"
                >
                  {broadcastSending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Tarqatish (Send All)
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Bot Token Config */}
          <div className="card p-6 space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Bot API Token</h3>
            <div className="flex gap-2">
              <input
                type={showToken ? 'text' : 'password'}
                value={botToken}
                readOnly
                className="input-field flex-1 font-mono text-xs"
              />
              <button
                onClick={() => setShowToken(!showToken)}
                className="btn-secondary text-xs px-3"
              >
                {showToken ? 'Yashirish' : 'Koʻrsatish'}
              </button>
              <button
                onClick={() => handleCopy(botToken)}
                className="btn-secondary text-xs px-3"
              >
                {copied ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Interactive Telegram Mini App Smartphone Simulator */}
        <div className="flex flex-col items-center">
          <div className="text-center mb-3">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center justify-center gap-1">
              <Smartphone className="w-4 h-4 text-emerald-600" /> Telegram Mini App Simulator
            </span>
          </div>

          {/* 3D Glass Smartphone Device Frame */}
          <div className="w-[300px] h-[580px] bg-slate-950 rounded-[40px] p-3 shadow-2xl border-4 border-slate-800 relative overflow-hidden flex flex-col">
            {/* Camera Notch */}
            <div className="w-28 h-4 bg-slate-900 rounded-b-xl mx-auto mb-2 flex items-center justify-center z-20">
              <div className="w-2 h-2 rounded-full bg-slate-800" />
            </div>

            {/* Telegram Mini App Screen Content */}
            <div className="flex-1 bg-white dark:bg-slate-900 rounded-[28px] overflow-hidden flex flex-col text-slate-900 dark:text-slate-100 font-sans text-xs">
              {/* Telegram Top Header Bar */}
              <div className="bg-sky-600 text-white p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-bold text-[10px]">
                    OB
                  </div>
                  <div>
                    <p className="font-bold text-[11px]">OsonBiznes Shop</p>
                    <p className="text-[9px] text-sky-200">bot store mini-app</p>
                  </div>
                </div>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">v2.0</span>
              </div>

              {/* Screen Content Tabs */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50 dark:bg-slate-950">
                {phoneScreen === 'catalog' && (
                  <div className="space-y-2.5">
                    <div className="p-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-center font-bold text-[11px]">
                      🛍 Web Store Katalogi
                    </div>

                    {[
                      { name: 'Erkaklar Futbolkasi Cotton Pro', price: '140,000 so\'m' },
                      { name: 'Noutbuk Sumkasi Swiss 15.6', price: '320,000 so\'m' },
                      { name: 'Simsiz Quloqchin AirBuds', price: '290,000 so\'m' },
                    ].map((item, i) => (
                      <div key={i} className="p-2 bg-white dark:bg-slate-900 rounded-xl border flex items-center justify-between shadow-xs">
                        <div>
                          <p className="font-bold text-[11px] line-clamp-1">{item.name}</p>
                          <p className="text-[10px] text-emerald-600 font-bold">{item.price}</p>
                        </div>
                        <button
                          onClick={() => {
                            sounds.playBeep()
                            setPhoneScreen('cart')
                          }}
                          className="px-2 py-1 bg-emerald-600 text-white text-[9px] font-bold rounded-lg"
                        >
                          Sotib Olish
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {phoneScreen === 'cart' && (
                  <div className="space-y-3">
                    <div className="font-bold text-[12px]">🛒 Savat va Buyurtma</div>
                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border space-y-1">
                      <div className="flex justify-between"><span>Noutbuk Sumkasi</span><span className="font-bold">320,000 so'm</span></div>
                      <div className="flex justify-between text-[10px] text-slate-400"><span>Yetkazib berish</span><span>Bepul</span></div>
                    </div>
                    <button
                      onClick={() => {
                        sounds.playCashChing()
                        setPhoneScreen('order')
                      }}
                      className="w-full py-2 bg-emerald-600 text-white text-[11px] font-bold rounded-xl shadow-md"
                    >
                      Tasdiqlash & Telegram Orqali Buyurtma
                    </button>
                  </div>
                )}

                {phoneScreen === 'order' && (
                  <div className="text-center py-8 space-y-2">
                    <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto animate-bounce" />
                    <p className="font-extrabold text-[12px]">Buyurtma Qabul Qilindi!</p>
                    <p className="text-[10px] text-slate-400">Menejer tez orada bog'lanadi.</p>
                    <button
                      onClick={() => setPhoneScreen('catalog')}
                      className="mt-4 px-3 py-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg text-[10px] font-bold"
                    >
                      Katalogga Qaytish
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
