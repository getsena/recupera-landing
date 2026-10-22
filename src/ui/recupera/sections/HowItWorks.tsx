import { Container, Dot, Eyebrow, SectionTitle } from './shared'

const pasos = [
  {
    titulo: 'Evaluación gratis',
    detalle: 'Revisamos antigüedad, montos y gestiones previas. Te respondemos en 24 horas.',
  },
  {
    titulo: 'Propuesta',
    detalle: 'Te decimos qué esperar de tu cartera antes de empezar.',
  },
  {
    titulo: 'Gestión',
    detalle:
      'Secuencias por correo, SMS y WhatsApp, y una ejecutiva del equipo de Sena para las llamadas y los casos complejos. Cuidamos la relación donde todavía se puede sostener; cuando no hay respuesta, la publicación en DICOM es el respaldo.',
  },
  {
    titulo: 'Liquidación',
    detalle: 'Cobramos 15% sobre lo efectivamente recuperado.',
  },
]

export const HowItWorks = () => (
  <section id="como" aria-labelledby="como-titulo" className="scroll-mt-24">
    {/* Ancla anterior de esta sección. */}
    <span id="como-funciona" className="block scroll-mt-24" aria-hidden="true" />
    <Container className="py-20 md:py-[104px] flex flex-col gap-11">
      <div className="flex flex-col gap-[18px] max-w-[760px]">
        <Eyebrow>Cómo funciona</Eyebrow>
        <SectionTitle id="como-titulo">
          Así recuperamos tu cartera
          <Dot />
        </SectionTitle>
      </div>
      <ol className="m-0 p-0 list-none grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t-2 border-brand-primary-dark">
        {pasos.map((p, i) => (
          <li
            key={p.titulo}
            className="py-7 flex flex-col gap-2.5 border-b border-border-default sm:odd:pr-6 sm:even:pl-6 sm:even:border-l lg:px-6 lg:border-l lg:first:pl-0 lg:first:border-l-0 lg:last:pr-0"
          >
            <span aria-hidden="true" className="font-caslon text-[34px] leading-none text-brand-primary">
              {i + 1}
            </span>
            <h3 className="m-0 text-[21px] font-bold">{p.titulo}</h3>
            <p className="m-0 text-text-muted">{p.detalle}</p>
          </li>
        ))}
      </ol>
    </Container>
  </section>
)
