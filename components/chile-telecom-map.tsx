"use client"

import { useEffect, useRef } from "react"
import Head from "next/head"

export default function ChileTelecomMap() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInitializedRef = useRef(false)

  useEffect(() => {
    // Cargar Leaflet dinámicamente
    const loadLeaflet = async () => {
      // Verificar si ya está inicializado
      if (mapInitializedRef.current) return

      // Verificar si el contenedor del mapa existe
      if (!mapRef.current) return

      // Asegurarse de que el contenedor tenga dimensiones
      mapRef.current.style.height = "100%"
      mapRef.current.style.width = "100%"

      try {
        // Esperar a que Leaflet esté disponible
        if (!window.L) {
          console.log("Esperando a que Leaflet se cargue...")
          await new Promise((resolve) => setTimeout(resolve, 1000))

          // Si después de esperar aún no está disponible, intentar cargar de nuevo
          if (!window.L) {
            console.error("Leaflet no se cargó correctamente")
            return
          }
        }

        console.log("Leaflet está disponible, inicializando mapa...")
        const L = window.L

        // Inicializar el mapa
        const map = L.map(mapRef.current, {
          center: [-33.4489, -70.6693], // Santiago, Chile
          zoom: 5,
          zoomControl: true,
          attributionControl: true,
        })

        // Marcar como inicializado
        mapInitializedRef.current = true

        // Añadir capa de tiles
        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          subdomains: "abcd",
          maxZoom: 19,
        }).addTo(map)

        // Añadir un marcador simple para verificar que funciona
        L.marker([-33.4489, -70.6693]).addTo(map).bindPopup("Santiago, Chile").openPopup()

        // Forzar un redimensionamiento para asegurar que el mapa se renderice correctamente
        setTimeout(() => {
          map.invalidateSize()
          console.log("Mapa inicializado y redimensionado")
        }, 500)
      } catch (error) {
        console.error("Error al inicializar el mapa:", error)
      }
    }

    // Intentar cargar Leaflet después de que el componente se monte
    loadLeaflet()

    // Limpiar al desmontar
    return () => {
      if (mapRef.current && window.L && mapInitializedRef.current) {
        try {
          // Intentar limpiar el mapa si existe
          const mapInstance = window.L.DomUtil.get(mapRef.current)
          if (mapInstance && mapInstance._leaflet_id) {
            mapInstance.remove()
          }
        } catch (e) {
          console.error("Error al limpiar el mapa:", e)
        }
      }
    }
  }, [])

  return (
    <>
      {/* Cargar Leaflet CSS y JS directamente en el componente */}
      <Head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin="anonymous"
        />
      </Head>

      {/* Script para cargar Leaflet */}
      <script
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
        crossOrigin="anonymous"
        async
      ></script>

      {/* Contenedor del mapa con dimensiones explícitas */}
      <div
        ref={mapRef}
        id="map"
        className="h-full w-full bg-[#1a1a2e]"
        style={{ height: "100%", width: "100%", minHeight: "400px" }}
      >
        {/* Indicador de carga */}
        {!mapInitializedRef.current && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a2e] bg-opacity-80 z-10">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-500 border-r-transparent align-[-0.125em]"></div>
              <p className="mt-2 text-purple-500">Cargando mapa...</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// Extender la interfaz Window para incluir Leaflet
declare global {
  interface Window {
    L: any
  }
}
