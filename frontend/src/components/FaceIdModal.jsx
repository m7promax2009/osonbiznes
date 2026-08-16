import React, { useState, useRef, useEffect } from 'react'
import { X, ScanFace, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import api from '../services/api'
import { MODEL_URL, FACE_MAP, CONFIDENCE, STABLE_FRAMES } from '../config/faceId'

// Demo rejimda kiritiladigan akkaunt (FACE_MAP dagi birinchi klass — salon egasi)
const DEMO_CLASS = Object.keys(FACE_MAP)[0] || 'Sardor'

// CDN skriptni bir marta yuklash
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve()
    const s = document.createElement('script')
    s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('Skript yuklanmadi: ' + src))
    document.head.appendChild(s)
  })
}

export default function FaceIdModal({ onClose, onLogin }) {
  // Faqat config'dagi MODEL_URL haqiqiy Teachable Machine rejimini yoqadi.
  // Aks holda — demo rejim (eski localStorage'dagi URL e'tiborga olinmaydi, chalkashlik bo'lmasin).
  const [modelUrl] = useState(MODEL_URL || '')
  useEffect(() => { if (!MODEL_URL) { try { localStorage.removeItem('tm_model_url') } catch (_) {} } }, [])
  const [phase, setPhase] = useState('idle') // idle | loading | scanning | matched | error
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const holderRef = useRef(null)
  const stopRef = useRef(null)
  const rafRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => () => stopEverything(), [])

  const stopEverything = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    if (stopRef.current) { try { stopRef.current() } catch (_) {} }
  }

  // Boshlash: haqiqiy Teachable Machine modeli bo'lsa — u bilan; bo'lmasa — demo yuz skani
  const begin = () => { modelUrl ? start(modelUrl) : startDemo() }

  // ===== DEMO: kamera + skan animatsiyasi + egaga kirish (model shart emas) =====
  const startDemo = async () => {
    setError(''); setPhase('loading'); setStatus('Kamera ochilmoqda...')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 240, height: 240 } })
      const video = document.createElement('video')
      video.autoplay = true; video.playsInline = true; video.muted = true
      video.srcObject = stream
      video.style.width = '240px'; video.style.height = '240px'; video.style.objectFit = 'cover'
      await video.play().catch(() => {})
      if (holderRef.current) { holderRef.current.innerHTML = ''; holderRef.current.appendChild(video) }
      stopRef.current = () => { stream.getTracks().forEach(t => t.stop()) }

      setPhase('scanning'); setStatus('Yuz aniqlanmoqda...')
      let pct = 58
      timerRef.current = setInterval(() => {
        pct = Math.min(99, pct + 7 + Math.round(Math.random() * 8))
        setStatus(`Aniqlanmoqda... ${pct}%`)
      }, 320)
      setTimeout(() => { if (timerRef.current) clearInterval(timerRef.current); finish(DEMO_CLASS) }, 2600)
    } catch (e) {
      setPhase('error')
      setError(e.name === 'NotAllowedError' ? 'Kameraga ruxsat berilmadi.' : (e.message || 'Kamera ochilmadi'))
    }
  }

  // ===== HAQIQIY: Teachable Machine modeli bilan yuzni tanish =====
  const start = async (url) => {
    setError(''); setPhase('loading'); setStatus('Model yuklanmoqda...')
    localStorage.setItem('tm_model_url', url)
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.7.4/dist/tf.min.js')
      await loadScript('https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8/dist/teachablemachine-image.min.js')
      const tmImage = window.tmImage
      if (!tmImage) throw new Error('Teachable Machine kutubxonasi yuklanmadi')

      const base = url.endsWith('/') ? url : url + '/'
      const model = await tmImage.load(base + 'model.json', base + 'metadata.json')

      setStatus('Kamera ochilmoqda...')
      const webcam = new tmImage.Webcam(240, 240, true)
      await webcam.setup()
      await webcam.play()
      if (holderRef.current) { holderRef.current.innerHTML = ''; holderRef.current.appendChild(webcam.canvas) }

      let stable = 0, lastClass = null, done = false
      stopRef.current = () => { try { webcam.stop() } catch (_) {} }
      setPhase('scanning'); setStatus('Yuzingizni kameraga qarating...')

      const loop = async () => {
        if (done) return
        webcam.update()
        const preds = await model.predict(webcam.canvas)
        let top = preds[0]
        for (const p of preds) if (p.probability > top.probability) top = p
        if (top.probability >= CONFIDENCE) {
          if (top.className === lastClass) stable++; else { lastClass = top.className; stable = 1 }
          setStatus(`Aniqlanmoqda: ${top.className} (${Math.round(top.probability * 100)}%)`)
          if (stable >= STABLE_FRAMES) { done = true; return finish(top.className) }
        } else { stable = 0; lastClass = null }
        rafRef.current = requestAnimationFrame(loop)
      }
      rafRef.current = requestAnimationFrame(loop)
    } catch (e) {
      setPhase('error')
      setError(e.message?.includes('Permission') || e.name === 'NotAllowedError' ? 'Kameraga ruxsat berilmadi.' : (e.message || 'Xatolik'))
    }
  }

  const finish = async (className) => {
    stopEverything()
    const cred = FACE_MAP[className] || FACE_MAP[DEMO_CLASS]
    if (!cred) { setPhase('error'); setError(`"${className}" uchun akkaunt biriktirilmagan.`); return }
    setPhase('matched'); setStatus(`Xush kelibsiz, ${className}!`)
    try {
      const res = await api.login(cred.email, cred.password)
      setTimeout(() => onLogin(res.user), 700)
    } catch (e) { setPhase('error'); setError(e.message) }
  }

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

          {(phase === 'loading' || phase === 'scanning' || phase === 'matched') && (
            <div className="text-center space-y-4">
              <div className="w-[240px] h-[240px] mx-auto rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
                {/* Kamera shu bo'sh div ichiga qo'yiladi — React uning ichki tugunlariga tegmaydi (removeChild xatosi bo'lmasin) */}
                <div ref={holderRef} className="absolute inset-0 flex items-center justify-center" />
                {phase === 'loading' && <Loader2 className="absolute inset-0 m-auto w-8 h-8 text-indigo-500 animate-spin z-10" />}
                {phase === 'scanning' && <div className="absolute inset-x-0 top-1/2 h-0.5 bg-indigo-500 shadow-[0_0_12px_#6366f1] animate-laser pointer-events-none z-10" />}
              </div>
              <p className={`text-sm font-semibold flex items-center justify-center gap-2 ${phase === 'matched' ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-300'}`}>
                {phase === 'matched' ? <CheckCircle2 className="w-5 h-5" /> : phase === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
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
