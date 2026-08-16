import React from 'react'

// Bitta skeleton blok
export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />
}

// Jadval qatorlari uchun skeleton (ro'yxat yuklanayotganda)
export function SkeletonRows({ rows = 6, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 card">
          <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  )
}

// Karta to'ri uchun skeleton (mahsulotlar, do'konlar)
export function SkeletonCards({ count = 8, className = '' }) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-3.5 space-y-3">
          <Skeleton className="w-full aspect-video rounded-xl" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <div className="flex justify-between pt-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-6 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default Skeleton
