import React, { useEffect, useRef, useState } from 'react'
import { LocateFixed, Loader2 } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

// Xaritada yetkazish nuqtasini belgilash: xaritani bosing yoki markerni suring, yoki "Joylashuvimni aniqlash".
// Kuryer (Yandex Go va h.k.) aynan shu nuqtaga boradi.
export default function LocationPicker({ value, onChange, center }) {
  const el = useRef(null)
  const map = useRef(null)
  const marker = useRef(null)
  const L = useRef(null)
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState('')

  const place = (lat, lng, pan = false) => {
    const Lf = L.current
    if (!Lf || !map.current) return
    if (!marker.current) {
      const icon = Lf.divIcon({ className: 'pin-icon', html: '<span></span>', iconSize: [34, 42], iconAnchor: [17, 40] })
      marker.current = Lf.marker([lat, lng], { draggable: true, icon, keyboard: true, title: 'Yetkazish nuqtasi' }).addTo(map.current)
      marker.current.on('dragend', () => {
        const p = marker.current.getLatLng()
        onChange({ lat: p.lat, lng: p.lng })
      })
    } else marker.current.setLatLng([lat, lng])
    if (pan) map.current.setView([lat, lng], Math.max(map.current.getZoom(), 16))
  }

  useEffect(() => {
    let disposed = false
    import('leaflet').then((mod) => {
      if (disposed || !el.current) return
      const Lf = mod.default || mod
      L.current = Lf
      const start = value || center || { lat: 41.3111, lng: 69.2797 }
      map.current = Lf.map(el.current, { zoomControl: true, attributionControl: true }).setView([start.lat, start.lng], value ? 16 : 12)
      Lf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map.current)
      map.current.on('click', (e) => {
        place(e.latlng.lat, e.latlng.lng)
        onChange({ lat: e.latlng.lat, lng: e.latlng.lng })
      })
      if (value) place(value.lat, value.lng)
    })
    return () => {
      disposed = true
      map.current?.remove()
      map.current = null
      marker.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Shahar almashsa — xarita o'sha shaharga o'tadi (nuqta hali tanlanmagan bo'lsa)
  useEffect(() => {
    if (map.current && center && !value) map.current.setView([center.lat, center.lng], 12)
  }, [center, value])

  const locate = () => {
    setGeoError('')
    if (!navigator.geolocation) {
      setGeoError("Brauzeringiz joylashuvni aniqlay olmaydi — xaritada belgilang")
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const { latitude: lat, longitude: lng } = pos.coords
        place(lat, lng, true)
        onChange({ lat, lng })
      },
      () => {
        setLocating(false)
        setGeoError("Joylashuvga ruxsat berilmadi — xaritani bosib nuqtani belgilang")
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div>
      <div className="relative rounded-2xl overflow-hidden border border-slate-200">
        <div ref={el} className="h-56 sm:h-64 w-full bg-slate-100" role="application" aria-label="Yetkazish nuqtasini tanlash xaritasi" />
        <button
          type="button"
          onClick={locate}
          className="absolute z-[500] right-2 top-2 h-9 px-3 rounded-lg bg-white shadow text-sm font-semibold text-[#111827] flex items-center gap-1.5 hover:bg-slate-50"
        >
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4 text-[#047857]" />}
          Joylashuvimni aniqlash
        </button>
        {!value && (
          <p className="absolute z-[500] left-2 bottom-2 px-2.5 py-1 rounded-lg bg-white/95 text-xs font-medium text-slate-700 shadow-sm pointer-events-none">
            Uyingiz turgan joyni xaritada bosing
          </p>
        )}
      </div>
      {geoError && <p className="mt-1.5 text-xs text-[#B91C1C]">{geoError}</p>}
    </div>
  )
}
