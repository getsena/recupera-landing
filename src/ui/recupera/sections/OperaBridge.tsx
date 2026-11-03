import { ArrowUpRight, Container, PillLink } from './shared'

export const OperaBridge = () => (
  <section aria-labelledby="opera-titulo" className="bg-surface-secondary">
    <Container className="py-16 md:py-[72px] flex flex-wrap items-center justify-between gap-x-12 gap-y-6">
      <div className="flex-[1_1_560px] min-w-0 flex flex-col gap-2.5">
        <h2 id="opera-titulo" className="m-0 font-canaro font-bold text-[30px] sm:text-[36px] leading-[1.1]">
          ¿Y la cartera que todavía no vence?
        </h2>
        <p className="m-0 text-[18px] text-text-body">
          Recupera resuelve lo que ya venció. Para gestionar toda tu cartera desde antes del vencimiento, está{' '}
          <strong>Ópera</strong>: tu equipo de cobranza externo, desde USD 50 al mes.
        </p>
      </div>
      <PillLink href="https://agente.somossena.com" variant="dark">
        Conoce Ópera
        <ArrowUpRight />
      </PillLink>
    </Container>
  </section>
)
