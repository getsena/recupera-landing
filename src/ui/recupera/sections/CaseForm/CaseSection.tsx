import { Accent, Container, Dot, Eyebrow, SectionTitle } from '../shared'
import { CaseForm } from './CaseForm'

export const CaseSection = () => (
  <section id="caso" aria-labelledby="caso-titulo" className="bg-brand-primary-dark text-white scroll-mt-24">
    {/* Ancla anterior del formulario: la usan el header de /term y /privacy (?section=contacto). */}
    <span id="contacto" className="block scroll-mt-24" aria-hidden="true" />
    <Container className="py-20 md:py-[104px] flex flex-wrap gap-x-[72px] gap-y-12 items-start">
      <div className="flex-[1_1_420px] min-w-0 flex flex-col gap-[22px]">
        <Eyebrow tone="onDark">Evaluación gratis</Eyebrow>
        <SectionTitle id="caso-titulo" size="xxl">
          Evalúa tu cartera <Accent className="text-text-on-dark-accent">gratis</Accent>
          <Dot />
        </SectionTitle>
        <p className="m-0 text-[19px] text-text-on-dark max-w-[42ch]">Te respondemos en 24 horas.</p>
      </div>
      <CaseForm />
    </Container>
  </section>
)
