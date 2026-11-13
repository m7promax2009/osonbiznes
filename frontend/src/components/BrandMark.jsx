import React from 'react'

// OsonBiznes asl belgisi (uycha) + jonli matn — har qanday fonda aniq o'qiladi
export default function BrandMark({ light = false, compact = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img src="/images/osonbiznes-icon.png" alt="" width="36" height="36" className="w-9 h-9 shrink-0" aria-hidden="true" />
      <span className={`font-display font-bold text-[1.1rem] tracking-tight ${compact ? 'max-[419px]:hidden' : ''} ${light ? 'text-white' : 'text-[#111827]'}`}>
        <span className="text-[#10B981]">Oson</span>Biznes
      </span>
    </span>
  )
}
