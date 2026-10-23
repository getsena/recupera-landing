import { Check, Container, Eyebrow, SectionTitle } from './shared'

const condiciones = [
  'Sin ticket mínimo: cualquier tamaño de cartera.',
  'Sin costo fijo ni mensualidad.',
  'Si no recuperamos, no pagas.',
]

export const Pricing = () => (
  <section id="precio" aria-labelledby="precio-titulo" className="bg-brand-primary text-white scroll-mt-24">
    {/* Ancla anterior de esta sección. */}
    <span id="precios" className="block scroll-mt-24" aria-hidden="true" />
    <Container className="py-20 md:py-24 flex flex-wrap gap-x-[72px] gap-y-10 items-center">
      <div className="flex-[1_1_420px] min-w-0 flex flex-col gap-[18px]">
        {/* Blanco y no #e3ebfa: el texto chico sobre el azul necesita 4.5:1. */}
        <Eyebrow tone="white">Precio</Eyebrow>
        <SectionTitle id="precio-titulo" size="xl">
          Solo pagas por lo que recuperamos.
        </SectionTitle>
      </div>
      <div className="flex-[1_1_420px] min-w-0 flex flex-col gap-4">
        <p className="m-0 flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
          <span className="font-canaro font-bold text-[72px] sm:text-[88px] leading-none">15%</span>
          <span className="text-[19px]">sobre el monto efectivamente recuperado</span>
        </p>
        <ul className="m-0 p-0 list-none flex flex-col gap-2.5 text-[18px]">
          {condiciones.map((c) => (
            <li key={c} className="flex gap-3 items-baseline">
              <span className="flex-none translate-y-px">
                <Check size={14} />
              </span>
              {c}
            </li>
          ))}
        </ul>
      </div>
    </Container>
  </section>
)
