import React, { useState, useEffect, useRef } from 'react'
import { FileText, Download, Check, X, Search, AlertCircle, Printer, QrCode, FileSpreadsheet, Plus, Sparkles, Building2, CheckCircle2, DollarSign } from 'lucide-react'
import api from '../services/api'
import sounds from '../utils/audio'
import { toast } from '../components/Toast'
import { exportToCSV } from '../utils/export'

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [stats, setStats] = useState({ total: 0, paid: 0, pending: 0, overdue: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [sellerProfile, setSellerProfile] = useState(null)
  const [form, setForm] = useState({ customer: '', items: [{ name: '', qty: 1, price: 0 }], dueDate: '', notes: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    loadInvoices()
    loadProfile()
  }, [filter])

  const loadProfile = async () => {
    try {
      const res = await api.getProfile()
      setSellerProfile(res?.user || null)
    } catch (_) {}
  }

  const loadInvoices = async () => {
    try {
      setLoading(true)
      const data = await api.getInvoices({ status: filter !== 'all' ? filter : undefined })
      setInvoices(data?.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      sounds.playSuccess()
      setError('')
      const validItems = form.items.filter(i => i.name && i.price > 0)
      if (validItems.length === 0) {
        setError('Kamida bitta mahsulot va narx kiritilishi kerak')
        return
      }

      await api.createInvoice({
        customer: form.customer,
        items: validItems,
        dueDate: form.dueDate || undefined,
        notes: form.notes,
      })
      toast.success('Hisob-faktura muvaffaqiyatli yaratildi')
      setShowCreate(false)
      setForm({ customer: '', items: [{ name: '', qty: 1, price: 0 }], dueDate: '', notes: '' })
      await loadInvoices()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      sounds.playClick()
      await api.updateInvoiceStatus(id, { status: newStatus })
      toast.success(`Faktura holati "${newStatus === 'paid' ? 'To\'langan' : newStatus}" ga o'zgartirildi`)
      loadInvoices()
    } catch (err) {
      toast.error(err.message || 'Xatolik yuz berdi')
    }
  }

  const handleExportCSV = () => {
    sounds.playClick()
    const headers = {
      invoiceNumber: 'Faktura №',
      customer: 'Xaridor',
      total: 'Jami Summa (so\'m)',
      status: 'Holati',
      dueDate: 'To\'lov Muddati',
      createdAt: 'Yaratilgan Sana',
    }
    const rows = invoices.map(i => ({
      invoiceNumber: i.invoiceNumber || i._id,
      customer: i.customer,
      total: i.total,
      status: i.status === 'paid' ? 'To\'langan' : i.status === 'overdue' ? 'Muddati o\'tgan' : 'Kutilmoqda',
      dueDate: i.dueDate ? new Date(i.dueDate).toLocaleDateString('uz-UZ') : '-',
      createdAt: i.createdAt ? new Date(i.createdAt).toLocaleDateString('uz-UZ') : '-',
    }))
    exportToCSV('Hisob_Fakturalar', headers, rows)
  }

  const handlePrintInvoice = (inv) => {
    sounds.playClick()
    const printWindow = window.open('', '_blank')
    const formattedTotal = new Intl.NumberFormat('ru-RU').format(inv.total) + " so'm"
    const qqsAmount = new Intl.NumberFormat('ru-RU').format(Math.round(inv.total * 0.12)) + " so'm"
    const sellerName = sellerProfile?.business || sellerProfile?.name || 'MCHJ "OsonBiznes Technology"'
    const sellerPhone = sellerProfile?.phone || '+998 90 000 00 00'

    printWindow.document.write(`
      <html>
        <head>
          <title>Hisob-Faktura - ${inv.invoiceNumber}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #10b981; padding-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; color: #10b981; }
            .meta { font-size: 13px; text-align: right; }
            .details { margin: 30px 0; display: flex; justify-content: space-between; }
            .box { background: #f8fafc; padding: 15px; border-radius: 8px; width: 45%; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: left; }
            th { background: #f1f5f9; font-size: 12px; }
            .total-box { text-align: right; margin-top: 30px; }
            .total { font-size: 20px; font-weight: bold; color: #059669; }
            .footer { margin-top: 50px; display: flex; justify-content: space-between; font-size: 12px; }
            .stamp { border: 2px dashed #10b981; padding: 10px 20px; border-radius: 8px; color: #10b981; font-weight: bold; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">HISOB-FAKTURA</div>
              <div style="font-size: 12px; color: #64748b;">№ ${inv.invoiceNumber}</div>
            </div>
            <div class="meta">
              <div>Sana: ${new Date(inv.createdAt).toLocaleDateString('uz-UZ')}</div>
              <div>To'lov muddati: ${new Date(inv.dueDate || inv.createdAt).toLocaleDateString('uz-UZ')}</div>
            </div>
          </div>

          <div class="details">
            <div class="box">
              <strong style="color: #10b981;">YETKAZIB BERUVCHI:</strong><br/>
              <strong>${sellerName}</strong><br/>
              Tel: ${sellerPhone}<br/>
              Platforma: OsonBiznes.uz<br/>
              Toshkent sh.
            </div>
            <div class="box">
              <strong style="color: #10b981;">XARIDOR:</strong><br/>
              <strong>${inv.customer}</strong><br/>
              Shartnoma bo'yicha to'lovchi<br/>
              Status: ${inv.status === 'paid' ? 'TOʻLANGAN' : 'KUTILMOQDA'}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>№</th>
                <th>Mahsulot / Xizmat Nomi</th>
                <th>Miqdori</th>
                <th>Birlik Narxi</th>
                <th style="text-align: right;">Jami Summa</th>
              </tr>
            </thead>
            <tbody>
              ${(inv.items || [{ name: 'Sotib olingan mahsulotlar', qty: 1, price: inv.total }]).map((item, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${item.name}</td>
                  <td>${item.qty} dona</td>
                  <td>${new Intl.NumberFormat('ru-RU').format(item.price)} so'm</td>
                  <td style="text-align: right; font-weight: bold;">${new Intl.NumberFormat('ru-RU').format(item.qty * item.price)} so'm</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="total-box">
            <div>Shu jumladan QQS (12%): <strong>${qqsAmount}</strong></div>
            <div class="total">JAMI TOʻLOV: ${formattedTotal}</div>
          </div>

          <div class="footer">
            <div>
              <br/><br/>
              Mas'ul shaxs: ____________________
            </div>
            <div class="stamp">
              ✓ RAQAMLI IMZO TASDIQLANDI<br/>
              OSONBIZNES DIGISIGN ID: 9283-4819
            </div>
          </div>

          <script>window.print(); setTimeout(() => window.close(), 500);</script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const filterLabels = {
    all: 'Barchasi',
    paid: "Toʻlangan",
    pending: 'Kutilmoqda',
    overdue: "Muddati oʻtgan",
  }

  const formatPrice = (p) => new Intl.NumberFormat('ru-RU').format(p || 0) + " so'm"

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Hisob-fakturalar & Faktura
            <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full font-mono font-bold border border-emerald-500/20">
              QQS 12% Tayyor
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Raqamli elektron hisob-fakturalar yaratish va PDF chop etish
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="btn-secondary flex items-center gap-1.5 text-xs font-bold py-2.5 px-3.5"
            title="Excel formatida yuklab olish"
          >
            <Download className="w-4 h-4 text-emerald-600" /> Excel / CSV Eksport
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <FileText className="w-4 h-4" /> Yangi Hisob-faktura Yaratish
          </button>
        </div>
      </div>

      {/* Filter Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Object.entries(filterLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => {
              sounds.playClick()
              setFilter(key)
            }}
            className={`p-4 rounded-2xl border text-left transition-all ${
              filter === key
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 shadow-md scale-[1.02]'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
            }`}
          >
            <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {key === 'all' ? invoices.length : invoices.filter(i => i.status === key).length}
            </p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase">{label}</p>
          </button>
        ))}
      </div>

      {/* Invoices List Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Faktura №</th>
                <th className="px-6 py-4">Xaridor Tashkilot / Mijoz</th>
                <th className="px-6 py-4">Jami Summa (QQS Bilan)</th>
                <th className="px-6 py-4">Hujjat Sanasi</th>
                <th className="px-6 py-4">Holat</th>
                <th className="px-6 py-4 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {invoices.map(inv => (
                <tr key={inv._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <td className="px-6 py-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {inv.invoiceNumber || inv._id}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">
                    {inv.customer}
                  </td>
                  <td className="px-6 py-4 font-extrabold text-slate-800 dark:text-slate-200">
                    {formatPrice(inv.total)}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('uz-UZ') : '-'}
                  </td>
                  <td className="px-6 py-4">
                    {inv.status === 'paid' && <span className="badge-green"><Check className="w-3 h-3" /> Toʻlangan</span>}
                    {inv.status === 'pending' && <span className="badge-yellow">Kutilmoqda</span>}
                    {inv.status === 'overdue' && <span className="badge-red"><AlertCircle className="w-3 h-3" /> Muddati oʻtgan</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {inv.status !== 'paid' && (
                        <button
                          onClick={() => handleUpdateStatus(inv._id, 'paid')}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg text-xs font-bold transition"
                          title="To'langan deb belgilash"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handlePrintInvoice(inv)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-xs"
                      >
                        <Printer className="w-3.5 h-3.5" /> Rasmiy PDF
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center">
                    <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" aria-hidden="true" />
                    <p className="text-sm text-slate-400">Hisob-fakturalar yo'q. "Yangi Hisob-faktura Yaratish" tugmasi orqali yarating.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
                Yangi Elektron Hisob-Faktura Yaratish
              </h3>
              <button onClick={() => setShowCreate(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Xaridor Tashkilot / Mijoz Nomi</label>
                <input required className="input-field" value={form.customer} onChange={e => setForm({...form, customer: e.target.value})} placeholder="Masalan: OOO 'Apex Corp'" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Mahsulotlar va Xizmatlar</label>
                <div className="space-y-2">
                  {form.items.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input placeholder="Mahsulot nomi" className="input-field flex-1" value={item.name} onChange={e => {
                        const items = [...form.items]
                        items[idx].name = e.target.value
                        setForm({...form, items})
                      }} />
                      <input type="number" placeholder="Soni" className="input-field w-20" value={item.qty} onChange={e => {
                        const items = [...form.items]
                        items[idx].qty = Number(e.target.value)
                        setForm({...form, items})
                      }} />
                      <input type="number" placeholder="Narxi" className="input-field w-32" value={item.price} onChange={e => {
                        const items = [...form.items]
                        items[idx].price = Number(e.target.value)
                        setForm({...form, items})
                      }} />
                    </div>
                  ))}
                  <button type="button" onClick={() => setForm({...form, items: [...form.items, { name: '', qty: 1, price: 0 }]})} className="text-xs text-emerald-600 font-bold hover:underline">
                    + Qator qo'shish
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Bekor qilish</button>
                <button type="submit" className="btn-primary flex-1 font-bold">Fakturani Yaratish</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
