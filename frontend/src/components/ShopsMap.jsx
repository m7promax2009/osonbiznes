import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Do'konlarni interaktiv kartada ko'rsatadi (OpenStreetMap).
// Har marker popup'ida: nomi, manzil, "Qo'ng'iroq" (tel:) va "Yo'l ko'rsatish" (Google Maps).
export default function ShopsMap({ shops = [], height = 400, activeId = null }) {
  const elRef = useRef(null)

  useEffect(() => {
    if (!elRef.current) return
    const withCoords = shops.filter(s => s.latitude && s.longitude)
    const center = withCoords[0] ? [withCoords[0].latitude, withCoords[0].longitude] : [41.311, 69.279] // Toshkent

    const map = L.map(elRef.current, { scrollWheelZoom: false, attributionControl: false }).setView(center, 12)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)

    const pin = (active) => L.divIcon({
      className: '',
      html: `<div style="transform:translate(-50%,-100%)">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="${active ? '#059669' : '#0f766e'}" stroke="#fff" stroke-width="1.5">
          <path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="#fff"/>
        </svg></div>`,
      iconSize: [34, 34], iconAnchor: [17, 34],
    })

    const markers = []
    withCoords.forEach(s => {
      const m = L.marker([s.latitude, s.longitude], { icon: pin(s._id === activeId) }).addTo(map)
      const dir = `https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}`
      const tel = (s.phone || '').replace(/[^\d+]/g, '')
      m.bindPopup(`
        <div style="min-width:170px;font-family:sans-serif">
          <div style="font-weight:700;font-size:13px;color:#0f172a">${s.name || 'Do\'kon'}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px">${s.address || s.city || ''}</div>
          <div style="display:flex;gap:6px;margin-top:8px">
            ${tel ? `<a href="tel:${tel}" style="flex:1;text-align:center;background:#059669;color:#fff;padding:6px 8px;border-radius:8px;font-size:11px;font-weight:700;text-decoration:none">📞 Qo'ng'iroq</a>` : ''}
            <a href="${dir}" target="_blank" rel="noreferrer" style="flex:1;text-align:center;background:#0ea5e9;color:#fff;padding:6px 8px;border-radius:8px;font-size:11px;font-weight:700;text-decoration:none">🧭 Yo'l</a>
          </div>
        </div>`)
      markers.push(m)
    })
    if (markers.length > 1) {
      try { map.fitBounds(L.featureGroup(markers).getBounds().pad(0.25)) } catch (_) {}
    }
    // activeId bo'lsa o'shanga fokus + popup
    if (activeId) {
      const act = withCoords.find(s => s._id === activeId)
      if (act) { map.setView([act.latitude, act.longitude], 14); markers.find((mk, i) => withCoords[i]._id === activeId)?.openPopup() }
    }

    return () => { map.remove() }
  }, [shops, activeId])

  return <div ref={elRef} style={{ height, width: '100%', borderRadius: '1rem', zIndex: 0 }} />
}
