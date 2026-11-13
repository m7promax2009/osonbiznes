import React, { useState } from 'react'
import { MailWarning } from 'lucide-react'
import api from '../services/api'

// Email tasdiqlanmagan bo'lsa: do'kon OsonBozor'da ko'rinmaydi va obuna sotib olinmaydi — shuni aytamiz
export default function EmailVerifyBanner({ user }) {
  const [verified, setVerified] = useState(user?.emailVerified !== false)
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  if (verified) return null

  const act = async (fn) => {
    setBusy(true)
    setMsg('')
    try {
      await fn()
    } catch (e) {
      setMsg(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-5 rounded-2xl border border-[#F5D27A] bg-[#FFF8E1] p-4 text-[#5B4300]">
      <div className="flex flex-wrap items-center gap-3">
        <MailWarning className="w-5 h-5 shrink-0" aria-hidden="true" />
        <p className="flex-1 min-w-[14rem] text-sm">
          <b>{user.email}</b> tasdiqlanmagan. Tasdiqlanmaguncha do'koningiz OsonBozor'da ko'rinmaydi va tarif sotib olib bo'lmaydi.
        </p>
        {!open && (
          <button
            type="button"
            disabled={busy}
            onClick={() => act(async () => { const r = await api.resendVerifyEmail(); setMsg(r.message); setOpen(true) })}
            className="px-4 py-2 rounded-full bg-[#0F172A] text-white text-sm font-bold hover:bg-[#1E293B]"
          >
            Kod olish
          </button>
        )}
      </div>
      {open && (
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            act(async () => {
              const u = await api.verifyEmail(code)
              setVerified(u.emailVerified)
            })
          }}
        >
          <input
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="6 xonali kod"
            className="w-40 rounded-xl border border-[#E6C463] bg-white px-3 py-2 text-center tracking-[0.3em] outline-none focus:ring-2 focus:ring-[#0F172A]/20"
          />
          <button type="submit" disabled={busy || code.length !== 6} className="px-4 py-2 rounded-full bg-[#0F172A] text-white text-sm font-bold disabled:opacity-50">
            Tasdiqlash
          </button>
        </form>
      )}
      {msg && <p className="mt-2 text-xs">{msg}</p>}
    </div>
  )
}
