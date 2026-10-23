'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

// Enlaces del tipo /?section=contacto (header de /term y /privacy): baja a esa sección al cargar.
export const SectionFromQuery = () => {
  const searchParams = useSearchParams()

  useEffect(() => {
    const section = searchParams.get('section')
    if (!section) return

    const tryScroll = (attempts = 0) => {
      const element = document.getElementById(section)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else if (attempts < 10) {
        setTimeout(() => tryScroll(attempts + 1), 100)
      }
    }

    tryScroll()
  }, [searchParams])

  return null
}
