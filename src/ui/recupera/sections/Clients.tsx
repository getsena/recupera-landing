import { AssetImage } from '@/lib/utils/assets/image'
import { Container } from './shared'

// Clientes vigentes. El alto de cada logo compensa las proporciones distintas de los archivos.
const clients = [
  { name: "L'Oréal", logo: AssetImage.lorealLogo.src, height: 'h-[22px]' },
  { name: 'Científica Andina', logo: AssetImage.cientificaLogo.src, height: 'h-[34px]' },
  { name: 'Inversora Maruz', logo: AssetImage.maruzLogo.src, height: 'h-[52px]' },
  { name: 'AOM', logo: AssetImage.aomLogo.src, height: 'h-[26px]' },
]

export const Clients = () => (
  <section id="clientes" aria-labelledby="clientes-titulo" className="border-b border-border-default">
    <Container className="py-9 flex flex-wrap items-center justify-between gap-x-10 gap-y-6">
      <h2 id="clientes-titulo" className="m-0 text-[15px] font-bold">
        Empresas que ya cobran con Sena
      </h2>
      <div className="flex flex-wrap items-center gap-x-11 gap-y-6 flex-[1_1_480px] justify-start md:justify-end">
        {clients.map((c) => (
          <img key={c.name} src={c.logo} alt={c.name} className={`${c.height} w-auto grayscale opacity-75`} />
        ))}
      </div>
    </Container>
  </section>
)
