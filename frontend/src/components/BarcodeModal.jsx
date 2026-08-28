import React, { useRef } from 'react'
import { X, Printer, Download, QrCode, Barcode as BarcodeIcon, Tag, CheckCircle } from 'lucide-react'
import sounds from '../utils/audio'
import { toast } from './Toast'

export default function BarcodeModal({ product, onClose }) {
  const printRef = useRef(null)

  if (!product) return null

  const handlePrint = () => {
    sounds.playClick()
    const content = printRef.current
    if (!content) return
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>Shtrix-kod chop etish - ${product.name}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 20px; }
            .tag { border: 2px dashed #333; padding: 15px; display: inline-block; border-radius: 8px; width: 220px; }
            .name { font-weight: bold; font-size: 14px; margin-bottom: 5px; }
            .price { font-size: 16px; color: #059669; font-weight: bold; margin: 8px 0; }
            .code { font-family: monospace; font-size: 12px; letter-spacing: 2px; }
            svg { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          <div class="tag">
            <div class="name">${product.name}</div>
            <div class="price">${new Intl.NumberFormat('uz-UZ').format(product.price || 0)} so'm</div>
            <svg viewBox="0 0 100 40" width="160" height="60">
              <rect x="0" y="0" width="100" height="40" fill="#fff"/>
              <rect x="5" y="5" width="3" height="30" fill="#000"/>
              <rect x="11" y="5" width="2" height="30" fill="#000"/>
              <rect x="15" y="5" width="5" height="30" fill="#000"/>
              <rect x="23" y="5" width="2" height="30" fill="#000"/>
              <rect x="27" y="5" width="4" height="30" fill="#000"/>
              <rect x="34" y="5" width="1" height="30" fill="#000"/>
              <rect x="38" y="5" width="6" height="30" fill="#000"/>
              <rect x="47" y="5" width="2" height="30" fill="#000"/>
              <rect x="52" y="5" width="4" height="30" fill="#000"/>
              <rect x="58" y="5" width="2" height="30" fill="#000"/>
              <rect x="63" y="5" width="5" height="30" fill="#000"/>
              <rect x="70" y="5" width="2" height="30" fill="#000"/>
              <rect x="75" y="5" width="3" height="30" fill="#000"/>
              <rect x="81" y="5" width="1" height="30" fill="#000"/>
              <rect x="85" y="5" width="4" height="30" fill="#000"/>
              <rect x="91" y="5" width="2" height="30" fill="#000"/>
            </svg>
            <div class="code">${product.sku || product.barcode || '871930029101'}</div>
          </div>
          <script>window.print(); setTimeout(() => window.close(), 500);</script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const sku = product.sku || product.barcode || '871930029101'
  const formattedPrice = new Intl.NumberFormat('uz-UZ').format(product.price || 0) + " so'm"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 z-10">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Shtrix-Kod Generator</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Preview Tag */}
        <div className="my-6 flex justify-center">
          <div
            ref={printRef}
            className="w-64 p-5 bg-white rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 shadow-md text-center flex flex-col items-center gap-2 transition hover:scale-105"
          >
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">OsonBiznes Tag</span>
            <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{product.name}</h4>
            <div className="text-emerald-600 font-extrabold text-base">{formattedPrice}</div>
            
            {/* SVG 1D Barcode Visual */}
            <div className="my-1 bg-white p-2 rounded">
              <svg viewBox="0 0 100 40" width="180" height="50">
                <rect x="0" y="0" width="100" height="40" fill="#fff"/>
                <rect x="2" y="2" width="3" height="36" fill="#000"/>
                <rect x="7" y="2" width="2" height="36" fill="#000"/>
                <rect x="11" y="2" width="5" height="36" fill="#000"/>
                <rect x="18" y="2" width="2" height="36" fill="#000"/>
                <rect x="22" y="2" width="4" height="36" fill="#000"/>
                <rect x="28" y="2" width="1" height="36" fill="#000"/>
                <rect x="31" y="2" width="6" height="36" fill="#000"/>
                <rect x="39" y="2" width="2" height="36" fill="#000"/>
                <rect x="43" y="2" width="4" height="36" fill="#000"/>
                <rect x="49" y="2" width="2" height="36" fill="#000"/>
                <rect x="53" y="2" width="5" height="36" fill="#000"/>
                <rect x="60" y="2" width="2" height="36" fill="#000"/>
                <rect x="64" y="2" width="3" height="36" fill="#000"/>
                <rect x="69" y="2" width="1" height="36" fill="#000"/>
                <rect x="72" y="2" width="4" height="36" fill="#000"/>
                <rect x="78" y="2" width="2" height="36" fill="#000"/>
                <rect x="82" y="2" width="5" height="36" fill="#000"/>
                <rect x="89" y="2" width="2" height="36" fill="#000"/>
                <rect x="93" y="2" width="4" height="36" fill="#000"/>
              </svg>
            </div>
            <p className="font-mono text-xs text-slate-800 tracking-widest font-bold">{sku}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Printer className="w-4 h-4" /> Chop Etish
          </button>
          <button
            onClick={() => {
              sounds.playClick()
              toast.info("Rasm sifatida saqlash funksiyasi tez orada. Hozircha 'Chop Etish' orqali chiqaring.")
            }}
            className="btn-secondary py-2.5 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Saqlash
          </button>
        </div>
      </div>
    </div>
  )
}
