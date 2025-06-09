"use client"

import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

export default function LeafletMap() {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mapRef.current) return

    // Make sure the map container is visible
    mapRef.current.style.height = "100%"
    mapRef.current.style.width = "100%"

    // Create map instance centered on Chile
    const map = L.map(mapRef.current).setView([-33.4489, -70.6693], 5) // Santiago, Chile

    // Use CartoDB dark matter tiles - no API key required
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map)

    // Apply custom CSS for purple accents and animations
    const style = document.createElement("style")
    style.textContent = `
      .leaflet-control-zoom a {
        background-color: #1a1a2e !important;
        color: #a742f5 !important;
        border-color: #3a3a5a !important;
      }
      .leaflet-control-zoom a:hover {
        background-color: #2d2d4a !important;
      }
      .leaflet-control-attribution {
        background-color: rgba(26, 26, 46, 0.8) !important;
        color: #a742f5 !important;
      }
      .leaflet-control-attribution a {
        color: #bb86fc !important;
      }
      
      /* Animación para las líneas de conectividad */
      @keyframes flowAnimation {
        0% {
          stroke-dashoffset: 100;
        }
        100% {
          stroke-dashoffset: 0;
        }
      }
      
      .telecom-flow {
        animation: flowAnimation 3s linear infinite;
        stroke-dasharray: 10, 15;
      }
      
      /* Estilo para las etiquetas de ciudades */
      .city-label {
        background-color: rgba(0, 0, 0, 0.7);
        border: 1px solid #a742f5;
        border-radius: 4px;
        padding: 2px 5px;
        font-weight: bold;
        box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
      }
      
      /* Animación para torres de celular */
      @keyframes pulseAnimation {
        0% {
          transform: scale(1);
          opacity: 0.7;
        }
        50% {
          transform: scale(1.2);
          opacity: 1;
        }
        100% {
          transform: scale(1);
          opacity: 0.7;
        }
      }
      
      .tower-pulse {
        animation: pulseAnimation 2s infinite;
        border-radius: 50%;
      }
    `
    document.head.appendChild(style)

    try {
      // Define ciudades chilenas con coordenadas
      const cities = [
        { name: "Santiago", coords: [-33.4489, -70.6693], type: "hub", population: 7112808 },
        { name: "Valparaíso", coords: [-33.0472, -71.6127], type: "hub", population: 934859 },
        { name: "Concepción", coords: [-36.8201, -73.044], type: "hub", population: 971368 },
        { name: "Antofagasta", coords: [-23.6509, -70.3975], type: "node", population: 361873 },
        { name: "La Serena", coords: [-29.9027, -71.2525], type: "node", population: 221054 },
        { name: "Temuco", coords: [-38.7359, -72.5904], type: "node", population: 282415 },
        { name: "Puerto Montt", coords: [-41.4693, -72.9424], type: "node", population: 245902 },
        { name: "Arica", coords: [-18.4783, -70.3126], type: "node", population: 222619 },
        { name: "Iquique", coords: [-20.2208, -70.1431], type: "node", population: 191468 },
        { name: "Rancagua", coords: [-34.1708, -70.7444], type: "node", population: 241774 },
        { name: "Talca", coords: [-35.4264, -71.6553], type: "node", population: 220357 },
        { name: "Punta Arenas", coords: [-53.1638, -70.9171], type: "node", population: 127454 },
        { name: "Calama", coords: [-22.4567, -68.9237], type: "node", population: 165731 },
        { name: "Copiapó", coords: [-27.3668, -70.3328], type: "node", population: 153937 },
        { name: "Osorno", coords: [-40.5714, -73.1392], type: "node", population: 161460 },
      ]

      // Añadir marcadores para las ciudades
      cities.forEach((city) => {
        // Determinar el tamaño del marcador basado en la población
        const size = Math.max(8, Math.min(20, city.population / 100000))

        // Color basado en el tipo (hub o nodo)
        const markerColor = city.type === "hub" ? "#a742f5" : "#00c8ff"

        // Crear marcador personalizado
        const icon = L.divIcon({
          html: `<div style="
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background-color: ${markerColor};
            border: 2px solid white;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
          " class="${city.type === "hub" ? "tower-pulse" : ""}"></div>`,
          className: "",
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        })

        // Añadir marcador al mapa
        const marker = L.marker(city.coords, { icon }).addTo(map)

        // Añadir etiqueta con el nombre de la ciudad
        marker
          .bindTooltip(city.name, {
            permanent: true,
            direction: "top",
            offset: [0, -size / 2 - 5],
            className: "city-label",
            opacity: 0.9,
          })
          .openTooltip()
      })

      // Definir rutas de conectividad de telefonía
      const telecomRoutes = [
        // Conexiones principales desde Santiago (hub central)
        {
          from: [-33.4489, -70.6693], // Santiago
          to: [-33.0472, -71.6127], // Valparaíso
          bandwidth: 100, // Gbps
          type: "fiber",
        },
        {
          from: [-33.4489, -70.6693], // Santiago
          to: [-36.8201, -73.044], // Concepción
          bandwidth: 100,
          type: "fiber",
        },
        {
          from: [-33.4489, -70.6693], // Santiago
          to: [-29.9027, -71.2525], // La Serena
          bandwidth: 40,
          type: "fiber",
        },
        {
          from: [-33.4489, -70.6693], // Santiago
          to: [-38.7359, -72.5904], // Temuco
          bandwidth: 40,
          type: "fiber",
        },
        {
          from: [-33.4489, -70.6693], // Santiago
          to: [-34.1708, -70.7444], // Rancagua
          bandwidth: 40,
          type: "fiber",
        },

        // Conexiones desde Valparaíso (hub regional)
        {
          from: [-33.0472, -71.6127], // Valparaíso
          to: [-29.9027, -71.2525], // La Serena
          bandwidth: 20,
          type: "fiber",
        },

        // Conexiones desde Concepción (hub regional)
        {
          from: [-36.8201, -73.044], // Concepción
          to: [-38.7359, -72.5904], // Temuco
          bandwidth: 20,
          type: "fiber",
        },
        {
          from: [-36.8201, -73.044], // Concepción
          to: [-35.4264, -71.6553], // Talca
          bandwidth: 20,
          type: "fiber",
        },
        {
          from: [-36.8201, -73.044], // Concepción
          to: [-41.4693, -72.9424], // Puerto Montt
          bandwidth: 20,
          type: "fiber",
        },

        // Conexiones del norte
        {
          from: [-18.4783, -70.3126], // Arica
          to: [-20.2208, -70.1431], // Iquique
          bandwidth: 10,
          type: "fiber",
        },
        {
          from: [-20.2208, -70.1431], // Iquique
          to: [-23.6509, -70.3975], // Antofagasta
          bandwidth: 20,
          type: "fiber",
        },
        {
          from: [-23.6509, -70.3975], // Antofagasta
          to: [-27.3668, -70.3328], // Copiapó
          bandwidth: 20,
          type: "fiber",
        },
        {
          from: [-27.3668, -70.3328], // Copiapó
          to: [-29.9027, -71.2525], // La Serena
          bandwidth: 20,
          type: "fiber",
        },
        {
          from: [-23.6509, -70.3975], // Antofagasta
          to: [-22.4567, -68.9237], // Calama
          bandwidth: 10,
          type: "fiber",
        },

        // Conexiones del sur
        {
          from: [-38.7359, -72.5904], // Temuco
          to: [-40.5714, -73.1392], // Osorno
          bandwidth: 10,
          type: "fiber",
        },
        {
          from: [-40.5714, -73.1392], // Osorno
          to: [-41.4693, -72.9424], // Puerto Montt
          bandwidth: 10,
          type: "fiber",
        },

        // Conexión a Punta Arenas (posiblemente submarina o satelital)
        {
          from: [-41.4693, -72.9424], // Puerto Montt
          to: [-53.1638, -70.9171], // Punta Arenas
          bandwidth: 5,
          type: "submarine",
        },
      ]

      // Crear líneas de conectividad con colores basados en el ancho de banda
      telecomRoutes.forEach((route) => {
        // Normalizar el ancho de banda a un valor entre 0 y 1
        const normalizedBandwidth = Math.min(1, route.bandwidth / 100)

        // Determinar el grosor de la línea basado en el ancho de banda
        const lineWeight = 2 + normalizedBandwidth * 6

        // Determinar el color basado en el tipo de conexión
        let color
        if (route.type === "fiber") {
          // Para fibra óptica: degradado de morado a azul según el ancho de banda
          const r = Math.round(167 + (0 - 167) * normalizedBandwidth)
          const g = Math.round(66 + (200 - 66) * normalizedBandwidth)
          const b = Math.round(245 + (255 - 245) * normalizedBandwidth)
          color = `rgb(${r}, ${g}, ${b})`
        } else if (route.type === "submarine") {
          // Para conexiones submarinas: verde azulado
          color = "#00E5FF"
        } else {
          // Para otros tipos: gris
          color = "#888888"
        }

        // Crear SVG overlay para línea animada
        const svgOverlay = createSvgOverlay(route.from, route.to, color, lineWeight, route.type)
        svgOverlay.addTo(map)

        // También añadir una polilínea regular para mejor visibilidad
        L.polyline([route.from, route.to], {
          color: color,
          weight: lineWeight,
          opacity: 0.6,
          // Línea punteada para conexiones submarinas
          dashArray: route.type === "submarine" ? "5, 10" : null,
        }).addTo(map)

        // Añadir etiqueta con información del ancho de banda
        const midpoint = [(route.from[0] + route.to[0]) / 2, (route.from[1] + route.to[1]) / 2]

        // Calcular un pequeño desplazamiento para la etiqueta
        const dx = route.to[1] - route.from[1]
        const dy = route.to[0] - route.from[0]
        const angle = Math.atan2(dy, dx)
        const offset = 0.05 // Desplazamiento perpendicular
        const labelPos = [midpoint[0] + Math.sin(angle) * offset, midpoint[1] - Math.cos(angle) * offset]

        L.marker(labelPos as [number, number], {
          icon: L.divIcon({
            html: `<div style="
              background-color: rgba(0,0,0,0.7);
              color: ${color};
              padding: 2px 5px;
              border-radius: 3px;
              font-size: 10px;
              font-weight: bold;
              border: 1px solid ${color};
            ">${route.bandwidth} Gbps</div>`,
            className: "",
            iconSize: [50, 20],
            iconAnchor: [25, 10],
          }),
        }).addTo(map)
      })

      // Función para crear SVG overlay con línea animada
      function createSvgOverlay(from, to, color, weight, type) {
        // Calcular bounds para el SVG
        const bounds = L.latLngBounds([from, to])

        // Crear elemento SVG
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
        svg.setAttribute("xmlns", "http://www.w3.org/2000/svg")
        svg.setAttribute("viewBox", "0 0 100 100")
        svg.setAttribute("preserveAspectRatio", "none")

        // Crear elemento de línea
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line")
        line.setAttribute("x1", "0")
        line.setAttribute("y1", "100")
        line.setAttribute("x2", "100")
        line.setAttribute("y2", "0")
        line.setAttribute("stroke", color)
        line.setAttribute("stroke-width", weight.toString())

        // Añadir animación solo para fibra óptica
        if (type === "fiber") {
          line.classList.add("telecom-flow")
        } else if (type === "submarine") {
          // Para submarino, usar línea punteada
          line.setAttribute("stroke-dasharray", "5, 10")
        }

        svg.appendChild(line)

        // Crear SVG overlay
        return L.svgOverlay(svg, bounds)
      }

      // Añadir leyenda al mapa
      const legend = L.control({ position: "bottomright" })
      legend.onAdd = (map) => {
        const div = L.DomUtil.create("div", "info legend")
        div.style.backgroundColor = "rgba(0,0,0,0.7)"
        div.style.padding = "10px"
        div.style.borderRadius = "5px"
        div.style.border = "1px solid #a742f5"
        div.style.color = "white"
        div.style.fontFamily = "Arial, sans-serif"

        div.innerHTML = `
          <div style="margin-bottom: 5px; font-weight: bold; text-align: center;">Leyenda</div>
          <div style="display: flex; align-items: center; margin-bottom: 5px;">
            <div style="width: 15px; height: 15px; border-radius: 50%; background-color: #a742f5; border: 1px solid white; margin-right: 5px;"></div>
            <span>Hub Principal</span>
          </div>
          <div style="display: flex; align-items: center; margin-bottom: 5px;">
            <div style="width: 15px; height: 15px; border-radius: 50%; background-color: #00c8ff; border: 1px solid white; margin-right: 5px;"></div>
            <span>Nodo Secundario</span>
          </div>
          <div style="display: flex; align-items: center; margin-bottom: 5px;">
            <div style="width: 30px; height: 3px; background-color: #a742f5; margin-right: 5px;"></div>
            <span>Fibra (100 Gbps)</span>
          </div>
          <div style="display: flex; align-items: center; margin-bottom: 5px;">
            <div style="width: 30px; height: 3px; background-color: #00c8ff; margin-right: 5px;"></div>
            <span>Fibra (10-40 Gbps)</span>
          </div>
          <div style="display: flex; align-items: center;">
            <div style="width: 30px; height: 3px; background-color: #00E5FF; border-top: 1px dashed #00E5FF; margin-right: 5px;"></div>
            <span>Submarino</span>
          </div>
        `

        return div
      }
      legend.addTo(map)
    } catch (error) {
      console.error("Error loading data:", error)
    }

    // Force a resize to ensure the map renders correctly
    setTimeout(() => {
      map.invalidateSize()
    }, 100)

    // Cleanup function
    return () => {
      map.remove()
    }
  }, [])

  return <div ref={mapRef} className="h-full w-full bg-[#1a1a2e]" id="map" />
}
