import React from 'react'

export default function Logo({ size = 40, showText = true, light = false, className = '' }) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src={light ? '/images/logo-dark.png' : '/images/logo-main.png'}
        alt="OsonBiznes"
        className="shrink-0 object-contain"
        style={{ height: size, width: 'auto' }}
        onError={(e) => {
          // Fallback if image fails
          e.target.style.display = 'none'
          if (e.target.nextSibling) {
            e.target.nextSibling.style.display = 'flex'
          }
        }}
      />
      <span
        style={{ display: 'none', width: size, height: size }}
        className="items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-extrabold shadow-md shrink-0"
      >
        OB
      </span>
      {showText && (
        <span className={`font-extrabold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: size * 0.45 }}>
          OsonBiznes
        </span>
      )}
    </div>
  )
}
