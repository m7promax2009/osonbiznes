import React from 'react'

// Barbero brend belgisi — sartarosh ustuni (barber pole) uslubidagi toza logo
export default function Logo({ size = 40, showText = true, light = false, className = '' }) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        className="relative inline-flex items-center justify-center rounded-2xl shadow-lg shadow-indigo-500/25 overflow-hidden shrink-0"
        style={{ width: size, height: size, background: 'linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)' }}
      >
        {/* Barber pole diagonal chiziqlar */}
        <svg viewBox="0 0 40 40" width={size} height={size} className="absolute inset-0 opacity-30">
          <defs>
            <pattern id="bp" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="5" height="10" fill="#fff" />
            </pattern>
          </defs>
          <rect width="40" height="40" fill="url(#bp)" />
        </svg>
        {/* Qaychi */}
        <svg viewBox="0 0 24 24" width={size * 0.55} height={size * 0.55} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative">
          <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
          <line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" />
        </svg>
      </span>
      {showText && (
        <span className={`font-extrabold tracking-tight ${light ? 'text-white' : 'text-slate-900 dark:text-white'}`} style={{ fontSize: size * 0.5 }}>
          Barbero
        </span>
      )}
    </div>
  )
}
