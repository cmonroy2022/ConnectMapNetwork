"use client"

import { useEffect, useRef, useState } from "react"
import { Scene, PointLayer, LineLayer } from "@antv/l7"
import { Mapbox } from "@antv/l7-maps"

export default function L7PlotMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const sceneRef = useRef<Scene | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const tourIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastCameraStateRef = useRef<{ zoom: number; pitch: number; rotation: number } | null>(null)

  // Estados para métricas y controles
  const [currentZoom, setCurrentZoom] = useState(5)
  const [labelHeightFactor, setLabelHeightFactor] = useState(60)
  const [isTourActive, setIsTourActive] = useState(false)
  const [tourDirection, setTourDirection] = useState<"north-to-south" | "south-to-north">("north-to-south")
  const [currentTourIndex, setCurrentTourIndex] = useState(0)

  // Añadir una nueva referencia para el índice actual del tour
  const currentTourIndexRef = useRef<number>(0)
  // Referencia para la dirección actual del tour
  const tourDirectionRef = useRef<"north-to-south" | "south-to-north">("north-to-south")

  // Configuración de velocidad del recorrido
  const TOUR_SPEED = {
    // Duración de la animación de la cámara en milisegundos
    CAMERA_ANIMATION_DURATION: 4000,
    // Tiempo total que permanece en cada ciudad en milisegundos
    CITY_STAY_DURATION: 3000,
  }

  // Valor fijo para la altura de los arcos
  const heightFactor = 0.3

  // Ordenar las ubicaciones de norte a sur (de arriba a abajo en el mapa)
  const orderedLocations = [
    { name: "Arica", lat: -18.4783, lng: -70.3126 },
    { name: "Iquique", lat: -20.2208, lng: -70.1431 },
    { name: "Calama", lat: -22.4567, lng: -68.9237 },
    { name: "Antofagasta", lat: -23.6509, lng: -70.3975 },
    { name: "Copiapó", lat: -27.3668, lng: -70.3328 },
    { name: "La Serena", lat: -29.9027, lng: -71.2525 },
    { name: "Valparaíso", lat: -33.0472, lng: -71.6127 },
    { name: "Santiago", lat: -33.4489, lng: -70.6693 },
    { name: "Rancagua", lat: -34.1708, lng: -70.7444 },
    { name: "Talca", lat: -35.4264, lng: -71.6553 },
    { name: "Concepción", lat: -36.8201, lng: -73.044 },
    { name: "Temuco", lat: -38.7359, lng: -72.5904 },
    { name: "Osorno", lat: -40.5714, lng: -73.1392 },
    { name: "Puerto Montt", lat: -41.4693, lng: -72.9424 },
    { name: "Punta Arenas", lat: -53.1638, lng: -70.9171 },
  ]

  // Función para calcular el factor de altura basado en el polinomio de grado 2
  const calculateHeightFactorFromZoom = (zoom: number) => {
    // Coeficientes del polinomio de grado 2
    const a = 7.94
    const b = -61.37
    const c = 137.73

    // Aplicar la fórmula: Etiqueta ≈ a·Zoom² + b·Zoom + c
    const result = a * Math.pow(zoom, 2) + b * zoom + c

    // Asegurar que el resultado sea positivo
    return Math.max(1, result)
  }

  // Modificar la función moveToLocation para centrar la cámara entre dos ciudades conectadas
  const moveToLocation = (index: number) => {
    if (!sceneRef.current || index < 0 || index >= orderedLocations.length) return

    const currentCity = orderedLocations[index]
    console.log(`Moviendo a: ${currentCity.name} (índice: ${index})`)

    // Encontrar la ciudad conectada (siguiente o anterior según la dirección)
    let connectedCityIndex = -1

    if (tourDirectionRef.current === "north-to-south") {
      // Si vamos de norte a sur, la ciudad conectada es la siguiente (si existe)
      connectedCityIndex = Math.min(index + 1, orderedLocations.length - 1)
    } else {
      // Si vamos de sur a norte, la ciudad conectada es la anterior (si existe)
      connectedCityIndex = Math.max(index - 1, 0)
    }

    const connectedCity = orderedLocations[connectedCityIndex]

    // Si estamos en el extremo (primera o última ciudad), solo mostramos esa ciudad
    if (connectedCityIndex === index) {
      try {
        const mapInstance = sceneRef.current.map
        if (mapInstance && typeof mapInstance.flyTo === "function") {
          mapInstance.flyTo({
            center: [currentCity.lng, currentCity.lat],
            zoom: 6,
            pitch: 45,
            duration: TOUR_SPEED.CAMERA_ANIMATION_DURATION,
          })
        } else {
          sceneRef.current.setCenter([currentCity.lng, currentCity.lat])
          sceneRef.current.setZoom(6)
          sceneRef.current.setPitch(45)
        }
        return
      } catch (error) {
        console.error("Error al mover la cámara:", error)
      }
    }

    // Calcular el punto medio entre las dos ciudades
    const centerLng = (currentCity.lng + connectedCity.lng) / 2
    const centerLat = (currentCity.lat + connectedCity.lat) / 2

    // Calcular la distancia entre las ciudades para determinar el zoom
    const dx = currentCity.lng - connectedCity.lng
    const dy = currentCity.lat - connectedCity.lat
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Ajustar el zoom basado en la distancia
    // Valores más pequeños = más alejado, valores más grandes = más cercano
    // Estos valores pueden necesitar ajustes según las distancias específicas
    let zoomLevel = 7

    if (distance < 1) {
      zoomLevel = 8 // Ciudades cercanas, zoom más cercano
    } else if (distance < 3) {
      zoomLevel = 7 // Distancia media
    } else if (distance < 10) {
      zoomLevel = 6 // Distancia grande
    } else {
      zoomLevel = 5 // Distancia muy grande (como Puerto Montt a Punta Arenas)
    }

    // Caso especial para la conexión Puerto Montt - Punta Arenas (muy larga)
    if (
      (currentCity.name === "Puerto Montt" && connectedCity.name === "Punta Arenas") ||
      (currentCity.name === "Punta Arenas" && connectedCity.name === "Puerto Montt")
    ) {
      zoomLevel = 4
    }

    console.log(`Centrando entre ${currentCity.name} y ${connectedCity.name}, zoom: ${zoomLevel}`)

    try {
      // En L7, el mapa subyacente se accede a través de la propiedad 'map'
      const mapInstance = sceneRef.current.map
      if (mapInstance && typeof mapInstance.flyTo === "function") {
        // Si es un mapa Mapbox, podemos usar flyTo con duración fija
        mapInstance.flyTo({
          center: [centerLng, centerLat],
          zoom: zoomLevel,
          pitch: 45,
          duration: TOUR_SPEED.CAMERA_ANIMATION_DURATION,
        })
      } else {
        // Alternativa usando métodos de L7
        sceneRef.current.setCenter([centerLng, centerLat])
        sceneRef.current.setZoom(zoomLevel)
        sceneRef.current.setPitch(45)
      }
    } catch (error) {
      console.error("Error al mover la cámara:", error)

      // Método alternativo si el anterior falla
      try {
        sceneRef.current.setCenter([centerLng, centerLat])
        sceneRef.current.setZoom(zoomLevel)
      } catch (e) {
        console.error("Error en método alternativo:", e)
      }
    }
  }

  // Función mejorada para mover a la siguiente ubicación en bucle continuo norte-sur-norte
  const moveToNextLocation = () => {
    if (!sceneRef.current) return

    // Usar la referencia en lugar del estado
    let nextIndex = currentTourIndexRef.current
    const currentDirection = tourDirectionRef.current

    if (currentDirection === "north-to-south") {
      nextIndex++

      // Si llegamos al final, cambiar la dirección
      if (nextIndex >= orderedLocations.length - 1) {
        // Cambiar a dirección sur-norte
        tourDirectionRef.current = "south-to-north"
        setTourDirection("south-to-north")
        console.log("Cambiando dirección: ahora de sur a norte")
      }
    } else {
      nextIndex--

      // Si llegamos al inicio, cambiar la dirección
      if (nextIndex <= 0) {
        // Cambiar a dirección norte-sur
        tourDirectionRef.current = "north-to-south"
        setTourDirection("north-to-south")
        console.log("Cambiando dirección: ahora de norte a sur")
      }
    }

    // Asegurarse de que el índice esté dentro de los límites
    nextIndex = Math.max(0, Math.min(nextIndex, orderedLocations.length - 1))

    // Actualizar la referencia inmediatamente
    currentTourIndexRef.current = nextIndex

    // Actualizar el estado para la UI (esto es asíncrono)
    setCurrentTourIndex(nextIndex)

    // Mover la cámara usando el índice de la referencia
    console.log(`Avanzando a índice: ${nextIndex} - Ciudad: ${orderedLocations[nextIndex].name}`)
    moveToLocation(nextIndex)
  }

  // Modificar la función toggleTour para usar la velocidad fija
  const toggleTour = () => {
    if (isTourActive) {
      // Detener el recorrido
      if (tourIntervalRef.current) {
        clearInterval(tourIntervalRef.current)
        tourIntervalRef.current = null
      }
      setIsTourActive(false)
    } else {
      // Iniciar el recorrido
      setIsTourActive(true)

      // Reiniciar el índice y la dirección
      const startIndex = 0
      setCurrentTourIndex(startIndex)
      currentTourIndexRef.current = startIndex // Actualizar también la referencia

      // Establecer dirección inicial norte-sur
      setTourDirection("north-to-south")
      tourDirectionRef.current = "north-to-south"

      // Mover inmediatamente a la primera ubicación
      moveToLocation(startIndex)

      // Iniciar el intervalo para el recorrido con velocidad fija
      const interval = setInterval(moveToNextLocation, TOUR_SPEED.CITY_STAY_DURATION)
      tourIntervalRef.current = interval
    }
  }

  // Función para ocultar el logo de AntV
  const hideAntVLogo = () => {
    if (!containerRef.current) return

    // Usar setTimeout para asegurarnos de que el DOM se ha actualizado
    setTimeout(() => {
      try {
        // Buscar el logo por su clase o estructura
        const logoElements = document.querySelectorAll(".l7-control-logo")

        // Si encontramos elementos con esa clase, ocultarlos
        if (logoElements.length > 0) {
          logoElements.forEach((el) => {
            if (el instanceof HTMLElement) {
              el.style.display = "none"
            }
          })
          console.log("Logo de AntV ocultado")
        } else {
          // Intentar con selectores CSS más específicos
          const container = containerRef.current
          if (container) {
            // Crear una hoja de estilo para ocultar el logo
            const style = document.createElement("style")
            style.textContent = `
              .l7-control-logo, 
              .l7-control .l7-control-logo, 
              .l7-control-container .l7-control-logo,
              [class*="l7-control-logo"] {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
              }
            `
            document.head.appendChild(style)
            console.log("Regla CSS para ocultar logo añadida")
          }
        }
      } catch (error) {
        console.error("Error al intentar ocultar el logo:", error)
      }
    }, 1000) // Esperar 1 segundo para asegurarnos de que el mapa está completamente cargado
  }

  // Añadir un useEffect para manejar los cambios en isTourActive
  useEffect(() => {
    // Si el tour se desactiva, limpiar el intervalo
    if (!isTourActive && tourIntervalRef.current) {
      clearInterval(tourIntervalRef.current)
      tourIntervalRef.current = null
      console.log("Tour desactivado, intervalo limpiado")
    }
  }, [isTourActive])

  // Modificar las dependencias del useEffect principal para que no se vuelva a ejecutar cuando cambian los estados del tour
  useEffect(() => {
    // Asegurarse de que estamos en el cliente y el contenedor existe
    if (typeof window === "undefined" || !containerRef.current) return

    // Limpiar cualquier instancia anterior
    if (sceneRef.current) {
      sceneRef.current.destroy()
    }

    // Crear una escena L7 con Mapbox
    const scene = new Scene({
      id: containerRef.current,
      map: new Mapbox({
        style: "dark",
        center: [-70.6693, -33.4489], // Santiago, Chile
        zoom: 5,
        pitch: 45, // Mayor inclinación para mejor visualización 3D
        minZoom: 3,
        maxZoom: 10,
        token: "", // Token proporcionado
        logoPosition: "bottom-right", // Intentar mover el logo a otra posición (puede que no afecte al logo de AntV)
      }),
      logoVisible: false, // Intentar ocultar el logo de L7
      controlOptions: {
        logoControl: false, // Intentar deshabilitar el control del logo
      },
    })

    sceneRef.current = scene

    // Ocultar el logo de AntV después de que la escena se cargue
    scene.on("loaded", () => {
      hideAntVLogo()
    })

    // Función para verificar si la cámara ha cambiado (zoom, rotación o inclinación)
    const hasCameraChanged = () => {
      if (!scene || !lastCameraStateRef.current) return true

      const currentZoom = scene.getZoom()
      const currentPitch = scene.getPitch()
      const currentRotation = scene.getRotation()

      const lastState = lastCameraStateRef.current

      // Verificar si alguno de los parámetros de la cámara ha cambiado
      const zoomChanged = Math.abs(currentZoom - lastState.zoom) > 0.001
      const pitchChanged = Math.abs(currentPitch - lastState.pitch) > 0.001
      const rotationChanged = Math.abs(currentRotation - lastState.rotation) > 0.001

      // Actualizar el estado de la cámara
      lastCameraStateRef.current = {
        zoom: currentZoom,
        pitch: currentPitch,
        rotation: currentRotation,
      }

      return zoomChanged || pitchChanged || rotationChanged
    }

    // Función para actualizar continuamente el zoom y las etiquetas
    const updateZoomAndLabels = () => {
      if (!scene) return

      // Verificar si la cámara ha cambiado
      if (hasCameraChanged()) {
        const zoom = scene.getZoom()
        setCurrentZoom(zoom)

        // Calcular y actualizar el factor de altura basado en el zoom
        const calculatedFactor = calculateHeightFactorFromZoom(zoom)
        setLabelHeightFactor(calculatedFactor)

        // Actualizar posición de etiquetas
        updateLabelsPosition()
      }

      // Continuar la animación
      animationFrameRef.current = requestAnimationFrame(updateZoomAndLabels)
    }

    // Datos de ciudades para Chile
    const cities = [
      { name: "Santiago", lng: -70.6693, lat: -33.4489, type: "hub", population: 7112808 },
      { name: "Valparaíso", lng: -71.6127, lat: -33.0472, type: "hub", population: 934859 },
      { name: "Concepción", lng: -73.044, lat: -36.8201, type: "hub", population: 971368 },
      { name: "Antofagasta", lng: -70.3975, lat: -23.6509, type: "node", population: 361873 },
      { name: "La Serena", lng: -71.2525, lat: -29.9027, type: "node", population: 221054 },
      { name: "Temuco", lng: -72.5904, lat: -38.7359, type: "node", population: 282415 },
      { name: "Puerto Montt", lng: -72.9424, lat: -41.4693, type: "node", population: 245902 },
      { name: "Arica", lng: -70.3126, lat: -18.4783, type: "node", population: 222619 },
      { name: "Iquique", lng: -70.1431, lat: -20.2208, type: "node", population: 191468 },
      { name: "Rancagua", lng: -70.7444, lat: -34.1708, type: "node", population: 241774 },
      { name: "Talca", lng: -71.6553, lat: -35.4264, type: "node", population: 220357 },
      { name: "Punta Arenas", lng: -70.9171, lat: -53.1638, type: "node", population: 127454 },
      { name: "Calama", lng: -68.9237, lat: -22.4567, type: "node", population: 165731 },
      { name: "Copiapó", lng: -70.3328, lat: -27.3668, type: "node", population: 153937 },
      { name: "Osorno", lng: -73.1392, lat: -40.5714, type: "node", population: 161460 },
    ]

    // Datos para etiquetas (mismo que cities pero para usar como capa separada)
    const cityLabels = [...cities]

    // Datos de conexiones para Chile
    const connections = [
      // Conexiones principales desde Santiago (hub central)
      {
        from: { lng: -70.6693, lat: -33.4489 }, // Santiago
        to: { lng: -71.6127, lat: -33.0472 }, // Valparaíso
        bandwidth: 100, // Gbps
        type: "fiber",
      },
      {
        from: { lng: -70.6693, lat: -33.4489 }, // Santiago
        to: { lng: -73.044, lat: -36.8201 }, // Concepción
        bandwidth: 100,
        type: "fiber",
      },
      {
        from: { lng: -70.6693, lat: -33.4489 }, // Santiago
        to: { lng: -71.2525, lat: -29.9027 }, // La Serena
        bandwidth: 40,
        type: "fiber",
      },
      {
        from: { lng: -70.6693, lat: -33.4489 }, // Santiago
        to: { lng: -72.5904, lat: -38.7359 }, // Temuco
        bandwidth: 40,
        type: "fiber",
      },
      {
        from: { lng: -70.6693, lat: -33.4489 }, // Santiago
        to: { lng: -70.7444, lat: -34.1708 }, // Rancagua
        bandwidth: 40,
        type: "fiber",
      },
      // Conexiones desde Valparaíso (hub regional)
      {
        from: { lng: -71.6127, lat: -33.0472 }, // Valparaíso
        to: { lng: -71.2525, lat: -29.9027 }, // La Serena
        bandwidth: 20,
        type: "fiber",
      },
      // Conexiones desde Concepción (hub regional)
      {
        from: { lng: -73.044, lat: -36.8201 }, // Concepción
        to: { lng: -72.5904, lat: -38.7359 }, // Temuco
        bandwidth: 20,
        type: "fiber",
      },
      {
        from: { lng: -73.044, lat: -36.8201 }, // Concepción
        to: { lng: -71.6553, lat: -35.4264 }, // Talca
        bandwidth: 20,
        type: "fiber",
      },
      {
        from: { lng: -73.044, lat: -36.8201 }, // Concepción
        to: { lng: -72.9424, lat: -41.4693 }, // Puerto Montt
        bandwidth: 20,
        type: "fiber",
      },
      // Conexiones del norte
      {
        from: { lng: -70.3126, lat: -18.4783 }, // Arica
        to: { lng: -70.1431, lat: -20.2208 }, // Iquique
        bandwidth: 10,
        type: "fiber",
      },
      {
        from: { lng: -70.1431, lat: -20.2208 }, // Iquique
        to: { lng: -70.3975, lat: -23.6509 }, // Antofagasta
        bandwidth: 20,
        type: "fiber",
      },
      {
        from: { lng: -70.3975, lat: -23.6509 }, // Antofagasta
        to: { lng: -70.3328, lat: -27.3668 }, // Copiapó
        bandwidth: 20,
        type: "fiber",
      },
      {
        from: { lng: -70.3328, lat: -27.3668 }, // Copiapó
        to: { lng: -71.2525, lat: -29.9027 }, // La Serena
        bandwidth: 20,
        type: "fiber",
      },
      {
        from: { lng: -70.3975, lat: -23.6509 }, // Antofagasta
        to: { lng: -68.9237, lat: -22.4567 }, // Calama
        bandwidth: 10,
        type: "fiber",
      },
      // Conexiones del sur
      {
        from: { lng: -72.5904, lat: -38.7359 }, // Temuco
        to: { lng: -73.1392, lat: -40.5714 }, // Osorno
        bandwidth: 10,
        type: "fiber",
      },
      {
        from: { lng: -73.1392, lat: -40.5714 }, // Osorno
        to: { lng: -72.9424, lat: -41.4693 }, // Puerto Montt
        bandwidth: 10,
        type: "fiber",
      },
      // Conexión a Punta Arenas (submarina)
      {
        from: { lng: -72.9424, lat: -41.4693 }, // Puerto Montt
        to: { lng: -70.9171, lat: -53.1638 }, // Punta Arenas
        bandwidth: 5,
        type: "submarine",
      },
    ]

    // Preparar los datos para las líneas
    const lineData = connections.map((conn) => {
      // Calcular la distancia entre los puntos
      const dx = conn.to.lng - conn.from.lng
      const dy = conn.to.lat - conn.from.lat
      const distance = Math.sqrt(dx * dx + dy * dy)

      return {
        coordinates: [
          [conn.from.lng, conn.from.lat],
          [conn.to.lng, conn.to.lat],
        ],
        bandwidth: conn.bandwidth,
        type: conn.type,
        distance: distance,
        // Calcular la duración de la animación basada en el ancho de banda
        // Menor duración = animación más rápida
        animationDuration: 3 - (conn.bandwidth / 100) * 2, // Entre 1 y 3 segundos
        // Calcular el intervalo de la animación basada en el ancho de banda
        animationInterval: 0.3 - (conn.bandwidth / 100) * 0.2, // Entre 0.1 y 0.3 segundos
        // Calcular la longitud de la estela basada en el ancho de banda
        trailLength: 0.6 + (conn.bandwidth / 100) * 0.3, // Entre 0.6 y 0.9
      }
    })

    // Crear datos para etiquetas de ancho de banda usando polígonos 3D
    const bandwidthLabelData = connections.map((conn, index) => {
      // Calcular punto medio
      const midLng = (conn.from.lng + conn.to.lng) / 2
      const midLat = (conn.from.lat + conn.to.lat) / 2

      // Calcular la distancia entre los puntos
      const dx = conn.to.lng - conn.from.lng
      const dy = conn.to.lat - conn.from.lat
      const distance = Math.sqrt(dx * dx + dy * dy)

      // Calcular la altura máxima del arco en el punto medio
      // Para un arco 3D, la altura máxima está en el punto medio
      const maxArcHeight = distance * heightFactor

      // Crear un objeto con la información necesaria para la etiqueta
      return {
        id: index,
        lng: midLng,
        lat: midLat,
        height: maxArcHeight, // Altura máxima del arco
        distance: distance,
        bandwidth: conn.bandwidth,
        type: conn.type,
        label: `${conn.bandwidth} Gbps`,
        // Guardar las coordenadas originales para cálculos adicionales si es necesario
        fromLng: conn.from.lng,
        fromLat: conn.from.lat,
        toLng: conn.to.lng,
        toLat: conn.to.lat,
      }
    })

    // Función para actualizar la posición de las etiquetas
    const updateLabelsPosition = () => {
      if (!scene || !containerRef.current) return

      const mapContainer = containerRef.current
      const labels = mapContainer.querySelectorAll(".bandwidth-label")

      labels.forEach((labelElement, index) => {
        const label = bandwidthLabelData[index]
        if (!label) return

        try {
          // Obtener el zoom actual
          const zoom = scene.getZoom()

          // Calcular el factor de altura basado en el polinomio de grado 2
          const calculatedLabelFactor = calculateHeightFactorFromZoom(zoom)

          // Calcular la altura máxima del arco 3D
          // En un arco 3D, la altura máxima está en el punto medio horizontal
          const midLng = label.lng
          const midLat = label.lat

          // Calcular la altura máxima del arco
          const maxArcHeight = label.distance * heightFactor

          // Convertir coordenadas geográficas a coordenadas de pantalla
          const position = scene.lngLatToPixel([midLng, midLat])

          // Calcular la altura en píxeles para la etiqueta
          // Multiplicamos por el factor calculado y ajustamos la escala
          const heightPixels = maxArcHeight * calculatedLabelFactor

          // Actualizar posición
          labelElement.setAttribute(
            "style",
            `
            position: absolute;
            background-color: rgba(0, 0, 0, 0.7);
            color: ${label.type === "submarine" ? "#00E5FF" : "#ffffff"};
            padding: 3px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
            white-space: nowrap;
            pointer-events: none;
            transform: translate(-50%, -50%);
            z-index: 1000;
            border: 1px solid ${label.type === "submarine" ? "#00E5FF" : "#ffffff"};
            box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
            left: ${position.x}px;
            top: ${position.y - heightPixels}px;
            transition: top 0.2s ease-out, left 0.2s ease-out;
          `,
          )
        } catch (e) {
          console.error("Error al posicionar etiqueta:", e)
        }
      })
    }

    // Esperar a que la escena se cargue
    scene.on("loaded", () => {
      try {
        console.log("Escena cargada, inicializando capas...")

        // Crear capas de líneas individuales para cada conexión con velocidades de animación diferentes
        lineData.forEach((line, index) => {
          const singleLineData = [line] // Datos para una sola línea

          const lineLayer = new LineLayer({ id: `line-${index}` })
            .source(singleLineData, {
              parser: {
                type: "json",
                coordinates: "coordinates",
              },
            })
            .shape("arc3d")
            .color("bandwidth", (bandwidth) => {
              const normalizedBandwidth = Math.min(1, bandwidth / 100)
              if (line.type === "submarine") {
                return "#00E5FF"
              }
              // Gradiente de morado a verde según el ancho de banda
              const r = Math.round(167 + (0 - 167) * normalizedBandwidth)
              const g = Math.round(66 + (200 - 66) * normalizedBandwidth)
              const b = Math.round(245 + (0 - 245) * normalizedBandwidth)
              return `rgb(${r}, ${g}, ${b})`
            })
            .size("bandwidth", (bandwidth) => {
              return 1 + bandwidth / 20
            })
            .style({
              opacity: 0.8,
              segmentNumber: 60, // Mayor número de segmentos para arcos más suaves
              height: ({ distance }) => {
                // Altura del arco proporcional a la distancia
                return distance * heightFactor
              },
            })

          // Configurar animación de flujo con velocidad basada en el ancho de banda
          lineLayer.animate({
            duration: line.animationDuration, // Duración basada en el ancho de banda
            interval: line.animationInterval, // Intervalo basado en el ancho de banda
            trailLength: line.trailLength, // Longitud de estela basada en el ancho de banda
          })

          // Añadir la capa de línea a la escena
          scene.addLayer(lineLayer)
        })

        // Crear capa de puntos para las ciudades
        const pointLayer = new PointLayer({})
          .source(cities, {
            parser: {
              type: "json",
              x: "lng",
              y: "lat",
            },
          })
          .shape("circle")
          .size("population", (population) => {
            // Escalar el tamaño basado en la población
            return Math.max(8, Math.min(20, population / 100000))
          })
          .color("type", (type) => (type === "hub" ? "#a742f5" : "#00c8ff"))
          .style({
            stroke: "#ffffff",
            strokeWidth: 2,
            opacity: 0.8,
          })

        // Añadir etiquetas para las ciudades usando PointLayer con texto
        const labelLayer = new PointLayer({})
          .source(cityLabels, {
            parser: {
              type: "json",
              x: "lng",
              y: "lat",
            },
          })
          .shape("name", "text")
          .size(12)
          .color("#ffffff")
          .style({
            textOffset: [0, -20],
            textAnchor: "center",
            spacing: 2,
            padding: [5, 5],
            stroke: "#000",
            strokeWidth: 2,
          })

        // Añadir las capas de puntos y etiquetas a la escena
        scene.addLayer(pointLayer)
        scene.addLayer(labelLayer)

        // Añadir HTML personalizado para las etiquetas de ancho de banda
        setTimeout(() => {
          const mapContainer = containerRef.current
          if (!mapContainer) return

          // Limpiar etiquetas existentes
          const existingLabels = mapContainer.querySelectorAll(".bandwidth-label")
          existingLabels.forEach((el) => el.remove())

          // Crear etiquetas HTML personalizadas
          bandwidthLabelData.forEach((label) => {
            const labelElement = document.createElement("div")
            labelElement.className = "bandwidth-label"
            labelElement.textContent = label.label
            mapContainer.appendChild(labelElement)
          })

          // Inicializar el estado de la cámara
          lastCameraStateRef.current = {
            zoom: scene.getZoom(),
            pitch: scene.getPitch(),
            rotation: scene.getRotation(),
          }

          // Iniciar la actualización continua
          animationFrameRef.current = requestAnimationFrame(updateZoomAndLabels)

          // Actualizar posición inicial
          updateLabelsPosition()

          // Realizar un pequeño zoom para forzar la actualización de las etiquetas
          // Este zoom es muy sutil y apenas perceptible
          setTimeout(() => {
            const currentZoom = scene.getZoom()
            scene.setZoom(currentZoom + 0.01)

            // Después de un breve momento, volver al zoom original
            setTimeout(() => {
              scene.setZoom(currentZoom)
            }, 100)
          }, 1000)

          // Registrar eventos adicionales para actualizar las etiquetas
          scene.on("camerachange", updateLabelsPosition)
          scene.on("rotatechange", updateLabelsPosition)
          scene.on("pitchchange", updateLabelsPosition)
          scene.on("dragend", updateLabelsPosition)

          // Intentar ocultar el logo de AntV nuevamente después de que todo esté cargado
          hideAntVLogo()
        }, 1000) // Esperar a que el mapa esté completamente cargado

        setIsLoaded(true)
        console.log("Mapa L7 inicializado correctamente")

        // Iniciar el recorrido automáticamente después de que el mapa se cargue
        setTimeout(() => {
          // Asegurarse de que empezamos desde Arica (índice 0)
          setCurrentTourIndex(0)
          currentTourIndexRef.current = 0 // Actualizar también la referencia
          setTourDirection("north-to-south")
          tourDirectionRef.current = "north-to-south"
          setIsTourActive(true)

          // Mover a la primera ubicación (Arica)
          moveToLocation(0)

          // Iniciar el intervalo para el recorrido automático con velocidad fija
          const interval = setInterval(moveToNextLocation, TOUR_SPEED.CITY_STAY_DURATION)
          tourIntervalRef.current = interval
        }, 2000) // Esperar 2 segundos después de que el mapa se cargue
      } catch (error) {
        console.error("Error al inicializar capas L7:", error)
      }
    })

    // Limpiar al desmontar
    return () => {
      if (sceneRef.current) {
        try {
          sceneRef.current.destroy()
        } catch (e) {
          console.error("Error al destruir la escena:", e)
        }
      }

      // Cancelar la animación
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      // Detener el recorrido automático
      if (tourIntervalRef.current) {
        clearInterval(tourIntervalRef.current)
        tourIntervalRef.current = null
      }

      // Limpiar etiquetas HTML personalizadas
      if (containerRef.current) {
        const labels = containerRef.current.querySelectorAll(".bandwidth-label")
        labels.forEach((el) => el.remove())
      }
    }
  }, []) // Eliminar las dependencias relacionadas con el tour

  // Agregar un estilo global para ocultar el logo de AntV
  useEffect(() => {
    // Crear un elemento de estilo para ocultar el logo
    const style = document.createElement("style")
    style.textContent = `
      .l7-control-logo, 
      .l7-control .l7-control-logo, 
      .l7-control-container .l7-control-logo,
      [class*="l7-control-logo"],
      .l7-control-attribution {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }
    `
    document.head.appendChild(style)

    // Limpiar al desmontar
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full bg-[#1a1a2e]" style={{ minHeight: "400px" }} />

      {/* Indicador de carga */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a2e] bg-opacity-80 z-10">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-500 border-r-transparent"></div>
            <p className="mt-2 text-purple-500">Cargando visualización de tráfico...</p>
          </div>
        </div>
      )}

      {/* Botón para iniciar/detener el recorrido automático */}
      <div className="absolute top-4 left-4 z-20">
        <button
          onClick={toggleTour}
          className={`px-4 py-2 rounded-md font-medium transition-colors shadow-lg ${
            isTourActive ? "bg-red-600 hover:bg-red-700 text-white" : "bg-purple-800 hover:bg-purple-700 text-white"
          }`}
        >
          {isTourActive ? "Detener Recorrido" : "Iniciar Recorrido"}
        </button>
        {isTourActive && (
          <div className="mt-2 bg-black bg-opacity-70 p-2 rounded-md text-white text-sm border border-purple-500">
            <p className="font-bold">Recorriendo: {orderedLocations[currentTourIndex].name}</p>
            <p>Dirección: {tourDirection === "north-to-south" ? "Norte a Sur" : "Sur a Norte"}</p>
          </div>
        )}
      </div>

      {/* Leyenda */}
      <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 p-3 rounded-md border border-purple-800 text-white text-sm z-20">
        <div className="font-bold mb-2 text-center">Leyenda</div>
        <div className="flex items-center mb-1">
          <div className="w-3 h-3 rounded-full bg-[#a742f5] mr-2"></div>
          <span>Hub Principal</span>
        </div>
        <div className="flex items-center mb-1">
          <div className="w-3 h-3 rounded-full bg-[#00c8ff] mr-2"></div>
          <span>Nodo Secundario</span>
        </div>
        <div className="flex items-center mb-1">
          <div className="w-6 h-2 bg-[#a742f5] mr-2"></div>
          <span>Fibra (100 Gbps)</span>
        </div>
        <div className="flex items-center mb-1">
          <div className="w-6 h-2 bg-[#00c8ff] mr-2"></div>
          <span>Fibra (10-40 Gbps)</span>
        </div>
        <div className="flex items-center">
          <div className="w-6 h-2 bg-[#00E5FF] mr-2 border-t border-dashed"></div>
          <span>Submarino</span>
        </div>
      </div>
    </div>
  )
}
