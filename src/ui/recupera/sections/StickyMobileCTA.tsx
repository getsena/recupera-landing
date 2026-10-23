'use client'

import { useEffect, useState } from 'react'
import { ArrowUpRight } from './shared'

// CTA fijo en móvil: desaparece mientras el formulario está a la vista.
export const StickyMobileCTA = () => {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const form = document.getElementById('caso')
    if (!form) return

    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), {
      threshold: 0,
    })
    observer.observe(form)
    return () => observer.disconnect()
  }, [])

  if (!visible) return null

  return (
    <div className="sticky-mobile-cta fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-border-default shadow-[0_-4px_16px_rgba(0,0,0,0.08)] md:hidden">
      <a
        href="#caso"
        className="w-full flex items-center justify-center gap-2 bg-brand-primary text-white font-bold no-underline py-3.5 px-6 rounded-full min-h-12 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-primary"
      >
        Evalúa tu cartera gratis
        <ArrowUpRight />
      </a>
    </div>
  )
}
