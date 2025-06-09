"use client"

import { useEffect, useRef } from "react"
import { Scene, LineLayer, PointLayer, PolygonLayer } from "@antv/l7"
import { Map } from "@antv/l7-maps"

export default function L7Map() {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mapRef.current) return

    // Inicializar la escena de L7
    const scene = new Scene({
      id: mapRef.current,
      map: new Map({
        style: "dark",
        center: [-98.5795, 39.8283],
        zoom: 3,
        pitch: 0,
        minZoom: 2,
        maxZoom: 10,
      }),
    })

    // Cargar los datos de los estados de EE.UU.
    scene.on("loaded", async () => {
      try {
        // Cargar GeoJSON de estados de EE.UU.
        const response = await fetch(
          "https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json",
        )
        const statesData = await response.json()

        // Capa de polígonos para los estados con bordes morados
        const statesLayer = new PolygonLayer({})
        statesLayer.source(statesData)
        statesLayer.shape("fill")
        statesLayer.color("#1a1a2e")
        statesLayer.style({
          opacity: 0.1,
          strokeWidth: 1.5,
          stroke: "#a742f5",
        })

        scene.addLayer(statesLayer)

        // Definir puntos de origen y destino con formato simplificado
        const points = [
          { name: "Seattle", longitude: -122.3321, latitude: 47.6062, type: "origin" },
          { name: "Los Angeles", longitude: -118.2437, latitude: 34.0522, type: "destination" },
          { name: "Denver", longitude: -104.9903, latitude: 39.7392, type: "origin" },
          { name: "Chicago", longitude: -87.6298, latitude: 41.8781, type: "destination" },
          { name: "New York", longitude: -74.006, latitude: 40.7128, type: "origin" },
          { name: "Miami", longitude: -80.1918, latitude: 25.7617, type: "destination" },
          { name: "Dallas", longitude: -96.797, latitude: 32.7767, type: "origin" },
          { name: "San Francisco", longitude: -122.4194, latitude: 37.7749, type: "destination" },
          { name: "Boston", longitude: -71.0589, latitude: 42.3601, type: "origin" },
          { name: "Atlanta", longitude: -84.388, latitude: 33.749, type: "destination" },
          { name: "Phoenix", longitude: -112.074, latitude: 33.4484, type: "origin" },
          { name: "Minneapolis", longitude: -93.265, latitude: 44.9778, type: "destination" },
        ]

        // Capa de puntos para ciudades - Formato simplificado
        const pointLayer = new PointLayer({})
        pointLayer.source(points)
        pointLayer.shape("circle")
        pointLayer.size(8)
        pointLayer.color("type", (type) => (type === "origin" ? "#ff0000" : "#00ff00"))
        pointLayer.style({
          stroke: "#ffffff",
          strokeWidth: 2,
        })

        scene.addLayer(pointLayer)

        // Definir rutas de tráfico con formato simplificado
        // Cada ruta es un objeto con coordenadas de inicio y fin
        const routes = [
          // Ruta Costa a Costa
          {
            name: "Seattle-San Francisco",
            coordinates: [
              [-122.3321, 47.6062],
              [-122.4194, 37.7749],
            ],
            count: 200,
          },
          {
            name: "San Francisco-Los Angeles",
            coordinates: [
              [-122.4194, 37.7749],
              [-118.2437, 34.0522],
            ],
            count: 180,
          },
          {
            name: "Los Angeles-Phoenix",
            coordinates: [
              [-118.2437, 34.0522],
              [-112.074, 33.4484],
            ],
            count: 150,
          },
          {
            name: "Phoenix-Dallas",
            coordinates: [
              [-112.074, 33.4484],
              [-96.797, 32.7767],
            ],
            count: 120,
          },
          {
            name: "Dallas-Atlanta",
            coordinates: [
              [-96.797, 32.7767],
              [-84.388, 33.749],
            ],
            count: 100,
          },
          {
            name: "Atlanta-Miami",
            coordinates: [
              [-84.388, 33.749],
              [-80.1918, 25.7617],
            ],
            count: 80,
          },
          {
            name: "Miami-New York",
            coordinates: [
              [-80.1918, 25.7617],
              [-74.006, 40.7128],
            ],
            count: 120,
          },
          {
            name: "New York-Boston",
            coordinates: [
              [-74.006, 40.7128],
              [-71.0589, 42.3601],
            ],
            count: 150,
          },
          // Ruta Central
          {
            name: "Denver-Chicago",
            coordinates: [
              [-104.9903, 39.7392],
              [-87.6298, 41.8781],
            ],
            count: 130,
          },
          {
            name: "Chicago-Minneapolis",
            coordinates: [
              [-87.6298, 41.8781],
              [-93.265, 44.9778],
            ],
            count: 90,
          },
          // Conexiones cruzadas
          {
            name: "Boston-Atlanta",
            coordinates: [
              [-71.0589, 42.3601],
              [-84.388, 33.749],
            ],
            count: 70,
          },
          {
            name: "Dallas-San Francisco",
            coordinates: [
              [-96.797, 32.7767],
              [-122.4194, 37.7749],
            ],
            count: 60,
          },
        ]

        // Crear capa de líneas simplificada
        const lineLayer = new LineLayer()
        lineLayer.source(routes)
        lineLayer.shape("arc") // Usar arcos para las líneas
        lineLayer.size("count", [1, 5]) // Tamaño basado en el conteo
        lineLayer.color("count", [
          "#ff0000",
          "#ff3300",
          "#ff6600",
          "#ff9900",
          "#ffcc00",
          "#ffff00",
          "#ccff00",
          "#99ff00",
          "#66ff00",
          "#33ff00",
          "#00ff00",
        ])
        lineLayer.style({
          opacity: 0.8,
          blur: 0.99,
        })

        // Intentar usar animate de manera más simple
        try {
          lineLayer.animate({
            interval: 0.1,
            duration: 1,
            trailLength: 0.8,
          })
        } catch (e) {
          console.warn("Animation not supported:", e)
        }

        scene.addLayer(lineLayer)

        // Añadir etiquetas para las ciudades
        const labelLayer = new PointLayer({})
        labelLayer.source(points)
        labelLayer.shape("name", "text")
        labelLayer.size(12)
        labelLayer.color("#ffffff")
        labelLayer.style({
          textOffset: [0, 20],
          textAnchor: "center",
          spacing: 2,
          padding: [5, 5],
          stroke: "#000",
          strokeWidth: 2,
        })

        scene.addLayer(labelLayer)
      } catch (error) {
        console.error("Error loading data:", error)
      }
    })

    // Limpiar al desmontar
    return () => {
      scene.destroy()
    }
  }, [])

  return <div ref={mapRef} className="h-full w-full bg-[#1a1a2e]" />
}
