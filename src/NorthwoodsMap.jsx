import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const townCoordinates = {
  minocqua: [45.8897, -89.729],
  'eagle-river': [45.9172, -89.2443],
  'boulder-junction': [46.1147, -89.6382],
  'presque-isle': [46.2491, -89.7273],
  'manitowish-waters': [46.1264, -89.8892],
  'land-o-lakes': [46.1544, -89.3387],
  rhinelander: [45.6366, -89.4121],
  mercer: [46.1666, -90.064],
  'hurley-ironwood': [46.4547, -90.171],
}

export function NorthwoodsMap({ town, label, className = '' }) {
  const elementRef = useRef(null)

  useEffect(() => {
    if (!elementRef.current) return undefined
    const coordinates = townCoordinates[town] || townCoordinates.minocqua
    const map = L.map(elementRef.current, { scrollWheelZoom: false, zoomControl: true }).setView(coordinates, 11)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map)
    L.circleMarker(coordinates, { radius: 9, color: '#123e35', fillColor: '#c98f3e', fillOpacity: 1, weight: 3 }).addTo(map).bindPopup(label || 'UpNorth.org')
    return () => map.remove()
  }, [town, label])

  return <div className={`northwoods-map ${className}`} ref={elementRef} role="img" aria-label={`Map showing ${label || town || 'this Northwoods location'}`} />
}
