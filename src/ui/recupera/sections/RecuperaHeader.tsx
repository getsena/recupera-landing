import { AssetImage } from '@/lib/utils/assets/image'
import { ArrowUpRight, Container } from './shared'

const enlaces = [
  { label: 'Cómo funciona', href: '#como' },
  { label: 'Precio', href: '#precio' },
  { label: 'Preguntas', href: '#faq' },
]

export const RecuperaHeader = () => (
  <header className="bg-white border-b border-border-default">
    <Container className="py-[18px] flex items-center justify-between gap-4">
      <a href="#inicio" aria-label="Sena Recupera, inicio" className="flex items-center gap-3 no-underline">
        <img src={AssetImage.logoBlack.src} alt="" className="h-9 sm:h-10 w-auto block" />
        <span className="font-caslon text-[22px] sm:text-2xl text-brand-primary">Recupera</span>
      </a>
      <nav aria-label="Principal" className="hidden md:flex flex-wrap gap-x-[26px] gap-y-1.5 text-[15px]">
        {enlaces.map((e) => (
          <a
            key={e.href}
            href={e.href}
            className="text-brand-primary-dark no-underline hover:text-brand-primary"
          >
            {e.label}
          </a>
        ))}
      </nav>
      {/* En móvil el CTA del hero queda a la vista: el del header no cabe junto al logo. */}
      <a
        href="#caso"
        className="hidden sm:inline-flex items-center gap-2 rounded-full bg-brand-primary text-white font-bold no-underline text-[15px] min-h-11 px-5 py-2.5 hover:bg-brand-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-primary"
      >
        Evalúa tu cartera gratis
        <ArrowUpRight />
      </a>
    </Container>
  </header>
)
