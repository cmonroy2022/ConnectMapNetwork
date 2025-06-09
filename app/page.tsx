"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

// Componente de carga
function LoadingMap() {
  return (
    <div className="h-[600px] w-full flex items-center justify-center bg-[#1a1a2e] text-purple-800">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-500 border-r-transparent"></div>
        <p className="mt-2">Cargando visualización de tráfico...</p>
      </div>
    </div>
  )
}

export default function Home() {
  // Estado para controlar si estamos en el cliente
  const [isClient, setIsClient] = useState(false)

  // Importación dinámica del mapa
  const L7PlotMap = dynamic(() => import("@/components/l7plot-map"), {
    ssr: false,
    loading: () => <LoadingMap />,
  })

  // Efecto para establecer isClient a true cuando estamos en el cliente
  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 bg-[#121212]">
      <div className="w-full max-w-5xl">
        <h1 className="text-2xl font-bold mb-4 text-purple-800">Red de Conectividad de Telefonía en Chile</h1>
        <div className="h-[600px] w-full rounded-lg overflow-hidden border border-purple-800 shadow-lg shadow-purple-800/20">
          {/* Solo renderizar el mapa en el cliente */}
          {isClient ? <L7PlotMap /> : <LoadingMap />}
        </div>
        <div className="mt-4 p-4 bg-[#1a1a2e] rounded-lg border border-purple-800">
          <h2 className="text-xl font-bold mb-2 text-purple-800">Información de la Red</h2>
          <p className="text-white mb-2">
            Este mapa muestra la infraestructura de red de una empresa de telecomunicaciones en Chile, incluyendo hubs
            principales, nodos secundarios y conexiones de fibra óptica con visualización de flujo de tráfico en tiempo
            real.
          </p>
          <p className="text-white mb-2">
            <span className="font-bold">Hubs Principales:</span> Santiago, Valparaíso y Concepción funcionan como
            centros de conectividad principales con redundancia y alta capacidad.
          </p>
          <p className="text-white">
            <span className="font-bold">Ancho de Banda:</span> Las conexiones varían desde 5 Gbps hasta 100 Gbps,
            dependiendo de la demanda y la importancia estratégica de cada ruta.
          </p>
        </div>
      </div>
    </main>
  )
}
