import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, ShoppingCart, Check, Heart, Store, Navigation } from 'lucide-react'
import { resolveImageUrl } from '../services/api'

export const formatPrice = (p) => new Intl.NumberFormat('ru-RU').format(p || 0) + " so'm"
const num = (p) => new Intl.NumberFormat('ru-RU').format(p || 0)

export const productImages = (p) => (p?.images?.length ? p.images : p?.image ? [p.image] : [])

// Mahsulot kartochkasi: rasm, kategoriya, saralanganlarga qo'shish, narx, do'kon va masofa, savat tugmasi.
// Butun kartochka — mahsulot sahifasiga havola.
export default function ProductCard({ product, onAdd, onOpen, showShop = true, fav = false, onFav }) {
  const imgs = productImages(product)
  const [imgIdx, setImgIdx] = useState(0)
  const [broken, setBroken] = useState(false)
  const [added, setAdded] = useState(false)
  const inStock = product.stock > 0
  const low = inStock && product.stock <= 3

  const stop = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }
  const add = (e) => {
    stop(e)
    if (!inStock) return
    onAdd?.(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1400)
  }

  const onMove = (e) => {
    if (imgs.length < 2) return
    const r = e.currentTarget.getBoundingClientRect()
    const i = Math.min(imgs.length - 1, Math.floor(((e.clientX - r.left) / r.width) * imgs.length))
    if (i !== imgIdx) setImgIdx(i)
  }

  return (
    <Link
      to={`/marketplace/product/${product._id}`}
      onClick={() => onOpen?.(product)}
      className="pcard group flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-[#10B981]/60 hover:shadow-[0_10px_30px_-12px_rgba(15,23,42,.18)] transition-[border-color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]"
    >
      <div className="relative aspect-square bg-[#F8FAFC]" onMouseMove={onMove} onMouseLeave={() => setImgIdx(0)}>
        {imgs.length > 0 && !broken ? (
          <img
            src={resolveImageUrl(imgs[imgIdx])}
            alt={product.name}
            loading="lazy"
            decoding="async"
            onError={() => setBroken(true)}
            className="absolute inset-0 w-full h-full object-contain p-4 mix-blend-multiply transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-slate-400">
            <Package className="w-10 h-10" aria-hidden="true" />
            <span className="text-[11px]">Rasm yo'q</span>
          </div>
        )}

        <span className="absolute top-2.5 left-2.5 max-w-[70%] truncate px-2 py-0.5 rounded-md bg-white/95 border border-slate-200 text-[11px] font-medium text-slate-700">
          {product.category}
        </span>

        {onFav && (
          <button
            type="button"
            onClick={(e) => {
              stop(e)
              onFav(product)
            }}
            aria-label={fav ? 'Saralanganlardan olib tashlash' : "Saralanganlarga qo'shish"}
            aria-pressed={fav}
            className="absolute top-2 right-2 w-9 h-9 rounded-full bg-white/95 shadow-sm flex items-center justify-center hover:scale-110 transition-transform"
          >
            <Heart className={`w-[18px] h-[18px] ${fav ? 'fill-[#F43F5E] text-[#F43F5E]' : 'text-slate-500'}`} />
          </button>
        )}

        {imgs.length > 1 && (
          <div className="absolute bottom-2 inset-x-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">
            {imgs.map((_, i) => (
              <span key={i} className={`h-0.5 flex-1 rounded-full ${i === imgIdx ? 'bg-[#10B981]' : 'bg-slate-300'}`} />
            ))}
          </div>
        )}
        {!inStock && <span className="absolute inset-0 bg-white/60 flex items-center justify-center text-sm font-semibold text-slate-600">Tugagan</span>}
      </div>

      <div className="p-3 sm:p-3.5 flex flex-col flex-1">
        <h3 className="text-[13px] sm:text-sm font-medium text-[#0F172A] leading-snug line-clamp-2 min-h-[2.6em]">{product.name}</h3>
        <div className="mt-2 flex items-end justify-between gap-2">
          <p className="leading-none">
            <span className="text-lg sm:text-xl font-bold text-[#047857] tracking-tight tabular-nums">{num(product.price)}</span>
            <span className="ml-1 text-xs text-slate-500">so'm</span>
          </p>
          <button
            type="button"
            onClick={add}
            disabled={!inStock}
            aria-label={`${product.name} — savatga qo'shish`}
            title="Savatga"
            className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              added ? 'bg-[#10B981] text-white' : inStock ? 'bg-[#ECFDF5] text-[#047857] hover:bg-[#047857] hover:text-white' : 'bg-slate-100 text-slate-300'
            }`}
          >
            {added ? <Check className="w-[18px] h-[18px]" /> : <ShoppingCart className="w-[18px] h-[18px]" />}
          </button>
        </div>
        {low && <p className="mt-1.5 text-[11px] font-medium text-[#C2410C]">Faqat {product.stock} ta qoldi</p>}

        {showShop && product.shopName && (
          <div className="mt-auto pt-2.5">
            <div className="pt-2.5 border-t border-slate-100 flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500 min-w-0">
              <span className="w-5 h-5 rounded-full bg-[#ECFDF5] flex items-center justify-center shrink-0">
                <Store className="w-3 h-3 text-[#047857]" aria-hidden="true" />
              </span>
              <span className="truncate">{product.shopName}</span>
              {product.distanceKm != null ? (
                <span className="ml-auto shrink-0 inline-flex items-center gap-0.5 font-medium text-[#0369A1]">
                  <Navigation className="w-3 h-3" aria-hidden="true" />
                  {product.distanceKm < 1 ? `${Math.round(product.distanceKm * 1000)} m` : `${product.distanceKm} km`}
                </span>
              ) : product.shopCity ? (
                <span className="ml-auto shrink-0">{product.shopCity}</span>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}
