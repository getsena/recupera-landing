import { getCountriesServer } from '@/lib/services/countryService.server'
import { getIpInfoServer } from '@/lib/services/ipConfigService.server'
import { ModalRenderer } from '@/ui/shared/ModalRender'
import { Toast } from '@/ui/shared/Toast'
import type { Metadata } from 'next'
import Script from 'next/script'
import { GoogleTagManager } from '@next/third-parties/google'
import { Suspense } from 'react'
import { adobeCleanFont, canaroFont, caslonFont } from './fonts'
import './globals.css'
import AttributionCapture from '@/ui/shared/AttributionCapture'
import Providers from './providers'

export const metadata: Metadata = {
  title: 'Recupera tu Cartera Vencida | Empresa de Cobranza B2B Chile',
  description:
    'Empresa de cobranza B2B en Chile. Recuperamos tu cartera vencida con publicación DICOM. Solo pagas si lo logramos. +85% recupero promedio.',
  keywords:
    'empresa de cobranza, empresa de cobranza b2b chile, cobranza b2b chile, recuperar cartera vencida, cobranza contingente, cobranza online, cobrar facturas vencidas, facturas impagas, publicacion dicom, externalizar cobranza b2b, servicio de cobranza empresas',
  authors: [{ name: 'Recupera' }],
  robots: { index: true, follow: true },
  metadataBase: new URL('https://recupera.somossena.com'),
  alternates: { canonical: '/' },
  twitter: {
    card: 'summary_large_image',
    title: 'Recupera tu Cartera Vencida | Empresa de Cobranza B2B Chile',
    description:
      'Empresa de cobranza B2B en Chile. Solo pagas si recuperamos tu cartera vencida. +85% de recupero promedio.',
    images: ['https://recupera.somossena.com/sena-crm-lite.jpg'],
  },
  openGraph: {
    title: 'Recupera tu Cartera Vencida | Empresa de Cobranza B2B Chile',
    description:
      'Empresa de cobranza B2B en Chile. Recuperamos tu cartera vencida con publicación DICOM. Solo pagas si lo logramos. +85% recupero.',
    type: 'website',
    url: 'https://recupera.somossena.com',
    images: ['https://recupera.somossena.com/sena-crm-lite.jpg'],
    siteName: 'Recupera',
    locale: 'es_CL',
  },
  other: {
    'facebook-domain-verification': 'tyjmxihsgkrx666ql4rwmnhsftl6hv',
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [ipInfo, countries] = await Promise.all([getIpInfoServer(), getCountriesServer()])
  const country = ipInfo?.country || null

  return (
    <Providers country={country} countries={countries}>
      <html lang="es" dir="ltr">
        <GoogleTagManager gtmId="GTM-M9XSZFKQ" />
        <head>
          <Script id="faq-schema" type="application/ld+json" strategy="beforeInteractive">
            {JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: [
                {
                  '@type': 'Question',
                  name: '¿Cuánto toma ver resultados?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Primeros contactos en 48-72h. Acuerdos típicamente en 2 semanas.',
                  },
                },
                {
                  '@type': 'Question',
                  name: '¿Qué pasa si no recuperan nada?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'No pagas nada. Modelo 100% contingente: solo cobramos un porcentaje sobre el monto efectivamente recuperado.',
                  },
                },
                {
                  '@type': 'Question',
                  name: '¿Se preservan las relaciones comerciales?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Sí. Nuestro enfoque profesional preserva los vínculos comerciales en cada gestión de cobranza B2B.',
                  },
                },
                {
                  '@type': 'Question',
                  name: '¿Con qué tipo de cartera trabajan?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Trabajamos con cartera vencida de +60 días, incluyendo facturas impagas y cuentas por cobrar B2B. Para gestión preventiva antes del vencimiento, tenemos otra solución — consultanos.',
                  },
                },
                {
                  '@type': 'Question',
                  name: '¿En qué países operan?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: '15 países en LATAM: Chile, Perú, Colombia, México, Argentina, Brasil, y más. Presencia local con conocimiento del mercado en cada país.',
                  },
                },
              ],
            })}
          </Script>
          {/* Google Ads — Recupera (AW-17962976949 / conv: sCCeCNfunKccELWNtfVC) */}
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=AW-17962976949"
            strategy="afterInteractive"
          />
          <Script id="google-ads-recupera" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'AW-17962976949');
            `}
          </Script>
          {/* Meta Pixel — Recupera (2395310237641682) */}
          <Script id="meta-pixel-recupera" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
              n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
              (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '2395310237641682');
              fbq('track', 'PageView');
            `}
          </Script>
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              src="https://www.facebook.com/tr?id=2395310237641682&ev=PageView&noscript=1"
              alt=""
            />
          </noscript>
        </head>
        <body
          className={`${canaroFont.variable} ${adobeCleanFont.variable} ${caslonFont.variable} antialiased font-adobe bg-surface-default`}
        >
          <Script id="disable-debugger" strategy="beforeInteractive">
            {`
              (function() {
                  const originalDebugger = window.debugger;
                  window.debugger = function() { return; };
              })();
            `}
          </Script>
          <AttributionCapture />
          <Suspense>{children}</Suspense>
          <ModalRenderer />
          <Toast />
        </body>
      </html>
    </Providers>
  )
}
