'use client'

import { useEffect } from 'react'

import { captureAttribution } from '@/lib/lead/clientAttribution'

// Guarda la atribución (gclid, gbraid, wbraid, fbclid y utm_*) en la primera carga de cualquier
// página, para que sobreviva a la navegación hasta que el visitante complete un formulario.
export default function AttributionCapture() {
  useEffect(() => {
    captureAttribution()
  }, [])
  return null
}
