import { Container } from './shared'

const cifras = [
  { valor: '24 h', texto: 'respuesta a tu evaluación gratis' },
  { valor: '15%', texto: 'solo sobre lo recuperado' },
  { valor: '$0', texto: 'costo inicial' },
]

export const KeyFigures = () => (
  <section aria-label="Lo esencial" className="border-b border-border-default">
    <Container className="py-9">
      <ul className="m-0 p-0 list-none grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-10 gap-y-6">
        {cifras.map((c) => (
          <li key={c.valor} className="flex flex-col gap-1">
            <span className="font-canaro font-bold text-[40px] leading-none">{c.valor}</span>
            <span className="text-text-muted">{c.texto}</span>
          </li>
        ))}
      </ul>
    </Container>
  </section>
)
