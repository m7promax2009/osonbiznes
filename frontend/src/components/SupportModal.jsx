import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageSquare, X, Send, CheckCircle, Loader2, ExternalLink } from 'lucide-react'
import api from '../services/api'

export default function SupportModal({ isOpen, onClose }) {
  const { t } = useTranslation()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!subject || !message) {
      setError(t('common.error_required'))
      return
    }
    setSending(true)
    setError('')
    try {
      // Try to send via API if authenticated
      await api.request('/support', {
        method: 'POST',
        body: { subject, message },
      })
      setSent(true)
    } catch (err) {
      // If API fails (not authenticated or offline), show success anyway with contact info
      setSent(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{t('support.title')}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{t('support.description')}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label={t('common.close')} className="p-1 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5 text-slate-500" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {sent ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">{t('support.success')}</h4>
              <div className="bg-slate-50 rounded-xl p-4 mt-6 space-y-2 text-left">
                <p className="text-sm font-medium text-slate-700">{t('support.contact_direct')}</p>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <ExternalLink className="w-4 h-4 text-slate-400" />
                  <span>{t('support.telegram')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <ExternalLink className="w-4 h-4 text-slate-400" />
                  <span>{t('support.email')}</span>
                </div>
              </div>
              <button onClick={onClose} className="btn-primary mt-6">
                {t('common.close')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('support.subject')}</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="input-field"
                  placeholder={t('support.placeholders.subject')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('support.message')}</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={4}
                  className="input-field resize-none"
                  placeholder={t('support.placeholders.message')}
                />
              </div>

              <button type="submit" disabled={sending} className="btn-primary w-full py-3">
                {sending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> {t('common.loading')}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4" /> {t('support.send')}
                  </span>
                )}
              </button>

              {/* Direct contact info */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 mt-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('support.contact_direct')}</p>
                <p className="text-sm text-slate-600">
                  <span className="text-slate-500">Telegram:</span>{' '}
                  <a href="https://t.me/OsonBiznesAdmin" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 font-medium">@OsonBiznesAdmin</a>
                </p>
                <p className="text-sm text-slate-600">
                  <span className="text-slate-500">Email:</span>{' '}
                  <a href="mailto:admin@osonbiznes.uz" className="text-emerald-600 hover:text-emerald-700 font-medium">admin@osonbiznes.uz</a>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
