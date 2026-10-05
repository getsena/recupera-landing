'use client'

import { pixelEventOptions } from '@/lib/lead/clientAttribution'
import { AssetImage } from '@/lib/utils/assets/image'
import Image from 'next/image'
import Link from 'next/link'
import Script from 'next/script'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    gtag?: (...args: unknown[]) => void
  }
}

export const ThankyouPage = () => {
  const router = useRouter()

  useEffect(() => {
    if (!window.dataLayer) {
      window.dataLayer = []
    }
    window.dataLayer.push({
      event: 'conversion_event_signup_2',
      origin: 'recupera',
    })
    if (window.gtag) {
      window.gtag('event', 'completar_formulario', { product: 'recupera' })
      window.gtag('event', 'conversion', { send_to: 'AW-17962976949/sCCeCNfunKccELWNtfVC' })
    }
    if (window.fbq) {
      window.fbq('track', 'Lead', { content_name: 'recupera' }, ...pixelEventOptions())
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex flex-col">
      {/* Header */}
      <div className="w-full py-6 flex justify-center">
        <button onClick={() => router.push('/')} className="cursor-pointer">
          <Image src={AssetImage.logoBlack} alt="Sena" className="w-36" />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-lg">
          {/* Card */}
          <div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden">
            {/* Top accent bar */}
            <div className="h-1.5 bg-linear-to-r from-brand-primary via-brand-primary to-brand-secondary" />

            <div className="px-8 pt-10 pb-10 md:px-12">
              {/* Success icon */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M20 6L9 17L4 12"
                      stroke="#22c55e"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Title */}
              <h1 className="font-canaro text-brand-primary-dark text-2xl md:text-3xl font-extrabold text-center leading-tight mb-3">
                ¡Hemos recibido tus datos
                <br />
                <span className="text-brand-primary">correctamente!</span>
              </h1>

              {/* Description */}
              <p className="text-slate-600 text-center text-sm md:text-base leading-relaxed mb-2">
                En breve nos pondremos en contacto contigo para continuar con el proceso.
              </p>

              <p className="text-brand-primary-dark text-center text-sm md:text-base font-bold leading-relaxed mb-6">
                Agenda tu reunión de 30 minutos ahora mismo. Sin compromiso.
              </p>

              {/* HubSpot inline calendar embed */}
              <div
                className="meetings-iframe-container w-full min-h-[500px]"
                data-src="https://meetings.hubspot.com/francisco502?embed=true"
              />
              <Script
                src="https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js"
                strategy="lazyOnload"
              />

              {/* Fallback link para mobile si el embed no carga */}
              <div className="flex justify-center mt-4">
                <Link
                  href="https://meetings.hubspot.com/francisco502"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-primary text-sm font-semibold hover:underline"
                >
                  Abrir calendario en nueva pestaña
                </Link>
              </div>

              {/* WhatsApp Agent */}
              <div className="flex flex-col items-center gap-3 mt-6 pt-6 border-t border-slate-100">
                <p className="text-slate-500 text-sm">¿Tienes dudas? Habla con nuestro agente</p>
                <Link
                  href="https://wa.me/56977290160?text=Hola%2C+acabo+de+registrarme+en+Recupera.+Quiero+saber+c%C3%B3mo+funciona+para+mi+cartera+de+facturas."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#1da851] text-white font-bold text-sm px-5 py-3 rounded-full transition-all duration-200 hover:shadow-lg hover:shadow-[#25D366]/25 hover:scale-[1.02]"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Hablar por WhatsApp
                </Link>
              </div>
            </div>
          </div>

          {/* Footer trust */}
          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="flex items-center gap-6 text-slate-400 text-xs">
              <span className="flex items-center gap-1.5">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M9 12L11 14L15 10"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Sin compromiso
              </span>
              <span className="flex items-center gap-1.5">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                30 min
              </span>
              <span className="flex items-center gap-1.5">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M17 21V19C17 16.7909 15.2091 15 13 15H5C2.79086 15 1 16.7909 1 19V21"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                Equipo experto
              </span>
            </div>

            <button
              onClick={() => router.push('/')}
              className="text-brand-primary text-sm font-semibold hover:underline cursor-pointer flex items-center gap-1"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path
                  d="M12 19L5 12L12 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Volver al inicio
            </button>

            <p className="text-slate-300 text-xs mt-2">
              Sena — <span className="font-caslon">El arte de cobrar bien</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
