import React, { useState, useRef, useEffect } from 'react'
import { X, ScanFace, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import api from '../services/api'
import { MODEL_URL, FACE_MAP, CONFIDENCE, STABLE_FRAMES } from '../config/faceId'

// Demo rejimda kiritiladigan akkaunt (FACE_MAP dagi birinchi klass — salon egasi)
const DEMO_CLASS = Object.keys(FACE_MAP)[0] || 'Sardor'

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve()
    const s = document.createElement('script')
    s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('Skript yuklanmadi: ' + src))
    document.head.appendChild(s)
  })
}

export default function FaceIdModal({ onClose, onLogin }) {
  // Faqat config'dagi MODEL_URL haqiqiy Teachable Machine rejimini yoqadi; aks holda demo.
  const [modelUrl] = useState(MODEL_URL || '')
  const [phase, setPhase] = useState('idle') // idle | loading | scanning | matched | error
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const videoRef = useRef(null)   // demo kamera (React boshqaradi — xavfsiz)
  const canvasRef = useRef(null)  // TM uchun (agar MODEL_URL bo'lsa)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const timerRef = useRef(null)
  const doneRef = useRef(false)

  useEffect(() => {
    if (!MODEL_URL) { try { localStorage.removeItem('tm_model_url') } catch (_) {} }
    return () => stopEverything()
  }, [])

  const stopEverything = () => {
    doneRef.current = true
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    if (streamRef.current) { try { streamRef.current.getTracks().forEach(t => t.stop()) } catch (_) {} }
    if (videoRef.current) { try { videoRef.current.srcObject = null } catch (_) {} }
  }

  const begin = () => { modelUrl ? start(modelUrl) : startDemo() }

  // ===== DEMO: kamera + skan + egaga kirish (React-boshqariladigan <video>) =====
  const startDemo = async () => {
    setError(''); doneRef.current = false; setPhase('scanning'); setStatus('Kamera ochilmoqda...')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 320, height: 320 } })
      streamRef.current = stream
      // <video> React tomonidan render qilingan — faqat oqimni ulaymiz
      const attach = () => {
        if (doneRef.current) return
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}) }
        else requestAnimationFrame(attach)
      }
      attach()
      setStatus('Yuz aniqlanmoqda...')
      let pct = 55
      timerRef.current = setInterval(() => {
        pct = Math.min(99, pct + 7 + Math.round(Math.random() * 8))
        setStatus(`Aniqlanmoqda... ${pct}%`)
      }, 320)
      setTimeout(() => { if (timerRef.current) clearInterval(timerRef.current); if (!doneRef.current) finish(DEMO_CLASS) }, 2600)
    } catch (e) {
      setPhase('error')
      setError(e.name === 'NotAllowedError' ? 'Kameraga ruxsat berilmadi. Manzil satridagi 🔒 → Kamera → Ruxsat bering.' : (e.message || 'Kamera ochilmadi'))
    }
  }

  // ===== HAQIQIY: Teachable Machine (faqat MODEL_URL bo'lsa) =====
  const start = async (url) => {
    setError(''); doneRef.current = false; setPhase('scanning'); setStatus('Model yuklanmoqda...')
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.7.4/dist/tf.min.js')
      await loadScript('https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8/dist/teachablemachine-image.min.js')
      const tmImage = window.tmImage
      if (!tmImage) throw new Error('Teachable Machine kutubxonasi yuklanmadi')
      const base = url.endsWith('/') ? url : url + '/'
      const model = await tmImage.load(base + 'model.json', base + 'metadata.json')

      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 320, height: 320 } })
      streamRef.current = stream
      const attach = () => {
        if (doneRef.current) return
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}) }
        else return requestAnimationFrame(attach)
      }
      attach()
      setStatus('Yuzingizni kameraga qarating...')

      let stable = 0, lastClass = null
      const loop = async () => {
        if (doneRef.current || !videoRef.current) return
        const canvas = canvasRef.current
        if (canvas && videoRef.current.videoWidth) {
          canvas.getContext('2d').drawImage(videoRef.current, 0, 0, 224, 224)
          const preds = await model.predict(canvas)
          let top = preds[0]
          for (const p of preds) if (p.probability > top.probability) top = p
          if (top.probability >= CONFIDENCE) {
            if (top.className === lastClass) stable++; else { lastClass = top.className; stable = 1 }
            setStatus(`Aniqlanmoqda: ${top.className} (${Math.round(top.probability * 100)}%)`)
            if (stable >= STABLE_FRAMES) { return finish(top.className) }
          } else { stable = 0; lastClass = null }
        }
        rafRef.current = requestAnimationFrame(loop)
      }
      rafRef.current = requestAnimationFrame(loop)
    } catch (e) {
      setPhase('error')
      setError(e.name === 'NotAllowedError' ? 'Kameraga ruxsat berilmadi.' : (e.message || 'Xatolik'))
    }
  }

  const finish = async (className) => {
    doneRef.current = true
    if (timerRef.current) clearInterval(timerRef.current)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const cred = FACE_MAP[className] || FACE_MAP[DEMO_CLASS]
    if (!cred) { setPhase('error'); setError(`"${className}" uchun akkaunt biriktirilmagan.`); return }
    setPhase('matched'); setStatus(`Xush kelibsiz, ${className}!`)
    try {
      const res = await api.login(cred.email, cred.password)
      // kamerani to'xtatib, keyin kirish (unmount'dан oldin)
      if (streamRef.current) { try { streamRef.current.getTracks().forEach(t => t.stop()) } catch (_) {} }
      setTimeout(() => onLogin(res.user), 600)
    } catch (e) { setPhase('error'); setError(e.message) }
  }

  const active = phase === 'loading' || phase === 'scanning' || phase === 'matched'

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => { stopEverything(); onClose() }}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center"><ScanFace className="w-5 h-5" /></div>
          <div className="flex-1"><p className="font-extrabold">Face ID bilan kirish</p><p className="text-xs text-indigo-100">Yuzingiz orqali bir soniyada kirish</p></div>
          <button onClick={() => { stopEverything(); onClose() }} className="p-1 text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6">
          {phase === 'idle' && (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center mx-auto"><ScanFace className="w-10 h-10 text-indigo-600" /></div>
              <p className="text-sm text-slate-600 dark:text-slate-300">Kamerani yoqing va yuzingizni ramka ichida ushlab turing — tizim sizni taniydi va kabinetingizga kiritadi.</p>
              <button onClick={begin} className="btn-primary w-full">Kamerani yoqish</button>
            </div>
          )}

          {active && (
            <div className="text-center space-y-4">
              <div className="w-[240px] h-[240px] mx-auto rounded-2xl overflow-hidden bg-slate-900 relative">
                <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                <canvas ref={canvasRef} width={224} height={224} className="hidden" />
                {phase === 'loading' && <Loader2 className="absolute inset-0 m-auto w-8 h-8 text-white animate-spin" />}
                {phase === 'scanning' && <div className="absolute inset-x-0 top-1/2 h-0.5 bg-indigo-400 shadow-[0_0_16px_#818cf8] animate-laser pointer-events-none" />}
                {phase === 'matched' && <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center"><CheckCircle2 className="w-16 h-16 text-emerald-400" /></div>}
              </div>
              <p className={`text-sm font-semibold flex items-center justify-center gap-2 ${phase === 'matched' ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-300'}`}>
                {phase === 'matched' ? <CheckCircle2 className="w-5 h-5" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                {status}
              </p>
            </div>
          )}

          {phase === 'error' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto"><AlertTriangle className="w-8 h-8 text-rose-600" /></div>
              <p className="text-sm text-rose-600 font-semibold">{error}</p>
              <button onClick={() => { setError(''); setPhase('idle') }} className="btn-secondary w-full">Qaytadan urinish</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
