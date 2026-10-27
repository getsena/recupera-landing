import { Container, Dot, Eyebrow, SectionTitle } from './shared'

const casos = [
  {
    titulo: 'Facturas con más de 90 días.',
    detalle: 'Clientes corporativos con pagos atrasados que requieren negociación profesional.',
  },
  {
    titulo: 'Clientes que dejaron de responder.',
    detalle: 'Escalamos con gestión profesional y, cuando corresponde, publicación en DICOM.',
  },
  {
    titulo: 'Facturas de alto valor sin gestión.',
    detalle: 'Cuando el monto justifica externalizar a un equipo que cobra solo sobre lo recuperado.',
  },
]

export const UseCases = () => (
  <section id="casos" aria-labelledby="casos-titulo" className="scroll-mt-24">
    {/* Ancla anterior de esta sección. */}
    <span id="casos-uso" className="block scroll-mt-24" aria-hidden="true" />
    <Container className="py-20 md:py-[104px] flex flex-wrap gap-x-[72px] gap-y-10">
      <div className="flex-[1_1_360px] min-w-0 flex flex-col gap-[18px]">
        <Eyebrow>Para quién · facturas vencidas hace más de 30 días</Eyebrow>
        <SectionTitle id="casos-titulo" size="md">
          ¿Tu empresa está en alguno de estos casos
          <Dot mark="?" />
        </SectionTitle>
      </div>
      <ul className="flex-[1_1_560px] min-w-0 m-0 p-0 list-none flex flex-col border-t border-border-default">
        {casos.map((c) => (
          <li key={c.titulo} className="py-[22px] border-b border-border-default flex flex-col gap-1">
            <strong className="text-[19px]">{c.titulo}</strong>
            <span className="text-text-muted">{c.detalle}</span>
          </li>
        ))}
      </ul>
    </Container>
  </section>
)
