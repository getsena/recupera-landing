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

const TITLE = 'Sena Recupera · Cobranza B2B de cartera vencida'
const DESCRIPTION =
  'Recuperamos las facturas que tu empresa no pudo cobrar, cuidando la relación donde se puede. Pagas 15% de lo recuperado, sin costo fijo ni ticket mínimo.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords:
    'cobranza b2b, cobranza de cartera vencida, recuperar cartera vencida, cobranza b2b chile, cobranza b2b perú, cobrar facturas vencidas, facturas impagas, cobranza contingente, externalizar cobranza b2b, empresa de cobranza, publicacion dicom chile',
  authors: [{ name: 'Sena', url: 'https://www.somossena.com' }],
  robots: { index: true, follow: true },
  metadataBase: new URL('https://recupera.somossena.com'),
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['https://recupera.somossena.com/sena-crm-lite.jpg'],
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    url: 'https://recupera.somossena.com',
    images: ['https://recupera.somossena.com/sena-crm-lite.jpg'],
    siteName: 'Sena',
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
