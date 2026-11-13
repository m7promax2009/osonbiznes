import React, { useRef } from 'react'
import { X, Printer, Download, CheckCircle2, Share2, Sparkles } from 'lucide-react'
import sounds from '../utils/audio'
import { toast } from './Toast'

export default function ThermalReceiptModal({ order, onClose }) {
  const printRef = useRef(null)

  if (!order) return null

  const formattedPrice = (num) => new Intl.NumberFormat('ru-RU').format(num || 0) + " so'm"
  const orderId = order._id || order.id || `ORD-${Math.floor(100000 + Math.random() * 900000)}`
  const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleString('uz-UZ') : new Date().toLocaleString('uz-UZ')

  const rawItems = order.items || [
    { name: 'Erkaklar futbolkasi', qty: 2, price: 120000 },
    { name: 'Noutbuk sumkasi', qty: 1, price: 250000 },
  ]
  // qty/quantity nomuvofiqligini bir joyda normallashtiramiz
  const items = rawItems.map(i => ({ ...i, qty: i.qty ?? i.quantity ?? 1 }))
  const totalAmount = order.total || items.reduce((acc, i) => acc + (i.price * i.qty), 0)
  const taxAmount = Math.round(totalAmount * 0.12) // 12% QQS

  const handlePrint = () => {
    sounds.playCashChing()
    const content = printRef.current
    if (!content) return
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>Fiskal Chek - ${orderId}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; width: 280px; margin: 0 auto; padding: 10px; color: #000; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .flex { display: flex; justify-content: space-between; font-size: 12px; }
            .item { font-size: 12px; margin: 4px 0; }
            .title { font-size: 16px; font-weight: bold; }
            .qr { margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="center title">🏪 OSONBIZNES SHOP</div>
          <div class="center" style="font-size: 10px;">Toshkent sh., Amir Temur shoh ko'chasi 42-uy</div>
          <div class="center" style="font-size: 10px;">STIR: 309 481 920 | TEL: +998 71 200 00 00</div>
          <div class="divider"></div>
          <div class="flex"><span>Chek №:</span><span class="bold">${orderId}</span></div>
          <div class="flex"><span>Sana/Vaqt:</span><span>${dateStr}</span></div>
          <div class="flex"><span>Mijoz:</span><span>${order.customer || 'Naqd xaridor'}</span></div>
          <div class="divider"></div>
          ${items.map(i => `
            <div class="item">
              <div class="bold">${i.name}</div>
              <div class="flex">
                <span>${i.qty} x ${formattedPrice(i.price)}</span>
                <span class="bold">${formattedPrice(i.qty * i.price)}</span>
              </div>
            </div>
          `).join('')}
          <div class="divider"></div>
          <div class="flex" style="font-size: 14px;"><span>JAMI:</span><span class="bold">${formattedPrice(totalAmount)}</span></div>
          <div class="flex"><span>Shu jumladan QQS (12%):</span><span>${formattedPrice(taxAmount)}</span></div>
          <div class="flex"><span>To'lov usuli:</span><span class="bold">${order.paymentMethod || 'Naqd pul / Karta'}</span></div>
          <div class="divider"></div>
          <div class="center qr">
            <svg viewBox="0 0 100 100" width="90" height="90">
              <path d="M10,10 h30 v30 h-30 z M15,15 v20 h20 v-20 z M22,22 h6 v6 h-6 z" fill="#000"/>
              <path d="M60,10 h30 v30 h-30 z M65,15 v20 h20 v-20 z M72,22 h6 v6 h-6 z" fill="#000"/>
              <path d="M10,60 h30 v30 h-30 z M15,65 v20 h20 v-20 z M22,72 h6 v6 h-6 z" fill="#000"/>
              <rect x="50" y="50" width="10" height="10" fill="#000"/>
              <rect x="70" y="60" width="20" height="10" fill="#000"/>
              <rect x="50" y="80" width="30" height="10" fill="#000"/>
            </svg>
            <div style="font-size: 9px; margin-top: 4px;">Fiskal Belgisi: 92834710293</div>
          </div>
          <div class="center bold" style="font-size: 11px; margin-top: 6px;">Xaridingiz uchun rahmat!</div>
          <div class="center" style="font-size: 9px;">osonbiznes.uz | Telegram: @OsonBiznesShopBot</div>
          <script>window.print(); setTimeout(() => window.close(), 500);</script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 z-10">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-emerald-600 font-bold">
            <CheckCircle2 className="w-5 h-5" />
            <span>Fiskal Chek Preview</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thermal Paper Styling */}
        <div className="my-5 flex justify-center">
          <div
            ref={printRef}
            className="w-72 bg-amber-50/50 dark:bg-slate-800 p-5 rounded-lg border border-slate-300 dark:border-slate-700 shadow-inner font-mono text-slate-900 dark:text-slate-100 text-xs space-y-3"
          >
            <div className="text-center">
              <h4 className="font-extrabold text-sm tracking-wider">🏪 OSONBIZNES SHOP</h4>
              <p className="text-[10px] text-slate-500">Toshkent sh., Amir Temur 42-uy</p>
              <p className="text-[10px] text-slate-500">STIR: 309 481 920 | TEL: +998 71 200 00 00</p>
            </div>

            <div className="border-t border-dashed border-slate-400 my-2" />

            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between"><span>Chek №:</span><span className="font-bold">{orderId}</span></div>
              <div className="flex justify-between"><span>Sana:</span><span>{dateStr}</span></div>
              <div className="flex justify-between"><span>Mijoz:</span><span>{order.customer || 'Naqd xaridor'}</span></div>
            </div>

            <div className="border-t border-dashed border-slate-400 my-2" />

            {/* Items */}
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <p className="font-bold">{item.name}</p>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>{item.qty} x {formattedPrice(item.price)}</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{formattedPrice(item.qty * item.price)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-slate-400 my-2" />

            <div className="space-y-1 text-xs">
              <div className="flex justify-between font-bold text-sm">
                <span>JAMI:</span>
                <span className="text-emerald-600 dark:text-emerald-400">{formattedPrice(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Shu jumladan QQS (12%):</span>
                <span>{formattedPrice(taxAmount)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>To'lov usuli:</span>
                <span className="font-bold">{order.paymentMethod || 'Naqd / Uzcard / Humo'}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-400 my-2" />

            <div className="text-center space-y-1">
              <div className="inline-block p-1 bg-white rounded border">
                <svg viewBox="0 0 100 100" width="70" height="70">
                  <path d="M10,10 h30 v30 h-30 z M15,15 v20 h20 v-20 z M22,22 h6 v6 h-6 z" fill="#000"/>
                  <path d="M60,10 h30 v30 h-30 z M65,15 v20 h20 v-20 z M72,22 h6 v6 h-6 z" fill="#000"/>
                  <path d="M10,60 h30 v30 h-30 z M15,65 v20 h20 v-20 z M22,72 h6 v6 h-6 z" fill="#000"/>
                  <rect x="50" y="50" width="10" height="10" fill="#000"/>
                  <rect x="70" y="60" width="20" height="10" fill="#000"/>
                  <rect x="50" y="80" width="30" height="10" fill="#000"/>
                </svg>
              </div>
              <p className="text-[9px] text-slate-400">Fiskal Belgisi: 92834710293</p>
              <p className="font-bold text-xs pt-1">Xaridingiz uchun rahmat! 😊</p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Printer className="w-4 h-4" /> Chek Chop Etish
          </button>
          <button
            onClick={() => {
              sounds.playClick()
              toast.info("Telegram orqali chek yuborish funksiyasi tez orada qo'shiladi")
            }}
            className="btn-secondary py-2.5 flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" /> Telegram
          </button>
        </div>
      </div>
    </div>
  )
}
