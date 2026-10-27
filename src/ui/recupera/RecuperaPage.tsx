import { Suspense } from 'react'
import Whatsapp from '../shared/WhatsApp'
import { recuperaEntityJsonLd, recuperaFaqJsonLd, recuperaServiceJsonLd } from './data/faqs'
import { SectionFromQuery } from './SectionFromQuery'
import { CaseSection } from './sections/CaseForm/CaseSection'
import { Clients } from './sections/Clients'
import { FAQ } from './sections/FAQ'
import { Hero } from './sections/Hero'
import { HowItWorks } from './sections/HowItWorks'
import { KeyFigures } from './sections/KeyFigures'
import { OperaBridge } from './sections/OperaBridge'
import { Pricing } from './sections/Pricing'
import { RecuperaFooter } from './sections/RecuperaFooter'
import { RecuperaHeader } from './sections/RecuperaHeader'
import { StickyMobileCTA } from './sections/StickyMobileCTA'
import { UseCases } from './sections/UseCases'

// Componente de servidor: todo el contenido (incluidas las respuestas de la FAQ) va en el HTML inicial.
// Solo el formulario, el CTA fijo de móvil y el botón de WhatsApp se hidratan.
export const RecuperaPage = () => (
  <div className="min-h-screen flex flex-col font-adobe text-brand-primary-dark text-[17px] leading-[1.55]">
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(recuperaEntityJsonLd) }}
    />
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(recuperaServiceJsonLd) }}
    />
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(recuperaFaqJsonLd) }}
    />
    <Suspense>
      <SectionFromQuery />
    </Suspense>
    <RecuperaHeader />
    <main className="grow">
      <Hero />
      <KeyFigures />
      <HowItWorks />
      <Pricing />
      <Clients />
      <UseCases />
      <OperaBridge />
      <FAQ />
      <CaseSection />
    </main>
    <RecuperaFooter />
    <StickyMobileCTA />
    <Whatsapp message="Hola, quiero información sobre Recupera para gestionar mi cartera vencida." animated />
  </div>
)
