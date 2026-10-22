import type { Metadata } from 'next'
import { RecuperaPage } from '@/ui/recupera/RecuperaPage'

export const metadata: Metadata = {
  alternates: { canonical: 'https://recupera.somossena.com' },
}

export default function Home() {
  return <RecuperaPage />
}
