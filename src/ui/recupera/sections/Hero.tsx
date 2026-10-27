import { Accent, ArrowUpRight, Container, PillLink, UnderlineLink } from './shared'

// Datos ficticios, rotulados como ejemplo.
const facturas = [
  { cliente: 'Comercial Norte Ltda.', vencida: '95 días', monto: '$2.380.000' },
  { cliente: 'Servicios Andes SpA', vencida: '142 días', monto: '$5.900.000' },
  { cliente: 'Distribuidora Sur', vencida: '210 días', monto: '$1.150.000' },
]

const CarteraEjemplo = () => (
  <figure className="m-0 flex-[1_1_440px] min-w-0 rounded-[20px] bg-surface-blue-soft p-5 sm:p-7 flex flex-col gap-[18px]">
    <div className="flex justify-between gap-3 text-[11px] tracking-[.12em] uppercase text-text-muted">
      <span>Así llega una cartera a Recupera</span>
      <span>Ejemplo ilustrativo</span>
    </div>
    <div className="rounded-[14px] bg-white p-4 sm:p-[22px] shadow-[0_10px_30px_rgba(30,44,80,.08)] flex flex-col gap-3.5">
      <div className="flex justify-between items-baseline gap-3 border-b border-border-default pb-3">
        <span className="font-bold">Facturas vencidas</span>
        <span className="text-[13px] text-text-secondary">Evaluación en curso</span>
      </div>
      <table className="w-full border-collapse text-[14px] sm:text-[15px] tabular-nums">
        <thead>
          <tr className="text-[13px] text-text-secondary">
            <th scope="col" className="text-left font-normal pb-1.5">
              Cliente
            </th>
            <th scope="col" className="text-left font-normal pb-1.5 px-2">
              Vencida hace
            </th>
            <th scope="col" className="text-right font-normal pb-1.5">
              Monto
            </th>
          </tr>
        </thead>
        <tbody>
          {facturas.map((f) => (
            <tr key={f.cliente}>
              <td className="py-[9px] border-t border-border-default">{f.cliente}</td>
              <td className="py-[9px] border-t border-border-default px-2 whitespace-nowrap">{f.vencida}</td>
              <td className="py-[9px] border-t border-border-default text-right whitespace-nowrap">
                {f.monto}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="m-0 rounded-[10px] bg-surface-secondary px-3.5 py-3 text-sm text-text-body">
        Próximo paso: contacto con cada cliente, cuidando la relación. La publicación en DICOM queda como
        respaldo.
      </p>
    </div>
    <figcaption className="text-[13px] text-text-muted">Si no recuperamos, no pagas.</figcaption>
  </figure>
)

export const Hero = () => (
  <section id="inicio" className="bg-surface-secondary scroll-mt-24">
    <Container className="pt-14 pb-14 md:pt-[88px] md:pb-16 flex flex-wrap gap-14 items-center">
      <div className="flex-[1_1_480px] min-w-0 flex flex-col gap-[26px]">
        <div className="flex items-center gap-2.5 text-[13px] font-bold tracking-[.14em] uppercase">
          <span aria-hidden="true" className="w-2 h-2 rounded-full bg-brand-secondary flex-none" />
          Cobranza B2B de cartera vencida en Chile y Perú
        </div>
        <h1 className="m-0 font-canaro font-bold text-[44px] sm:text-[58px] lg:text-[70px] leading-[1.04] tracking-[-.02em] text-balance">
          Recupera tu cartera vencida. Pagas solo si lo{' '}
          <Accent className="text-brand-primary">logramos</Accent>
          <Accent className="text-brand-secondary">.</Accent>
        </h1>
        <p className="m-0 text-[19px] leading-[1.6] text-text-body max-w-[54ch]">
          Recuperamos las facturas que tu empresa ya no pudo cobrar, cuidando la relación donde todavía se
          puede. Pagas 15% solo sobre lo que recuperamos, sin costo fijo ni ticket mínimo.
        </p>
        <div className="flex flex-wrap gap-x-[22px] gap-y-3.5 items-center">
          <PillLink href="#caso">
            Evalúa tu cartera gratis
            <ArrowUpRight />
          </PillLink>
          <UnderlineLink href="#como">Cómo funciona</UnderlineLink>
        </div>
      </div>
      <CarteraEjemplo />
    </Container>
  </section>
)
