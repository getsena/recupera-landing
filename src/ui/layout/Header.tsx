'use client'

import { useModalStore } from '@/lib/store/modalStore'
import { useCurrencyStore } from '@/lib/store/useCurrencyStore'
import { AssetIcon } from '@/lib/utils/assets/icon'
import { AssetImage } from '@/lib/utils/assets/image'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import Button from '../shared/Button'

type Props = {
  variant: 'primary' | 'secondary'
}

const SENA_BASE_URL = 'https://www.somossena.com'

type NavItem =
  | { id: number; name: string; type: 'scroll'; href: string }
  | { id: number; name: string; type: 'redirect'; href: string }
  | { id: number; name: string; type: 'external'; href: string }
  | {
      id: number
      name: string
      type: 'dropdown'
      key: 'productos' | 'industrias'
    }

type IndustryItem = {
  id: number
  name: string
  href: string
  description?: string
  icon?: React.ReactNode
}

type ProductItem = {
  id: number
  name: string
  description?: string
  tab: 'autogestion' | 'recuperacion' | 'external'
  href?: string
}

type MobileMenuContentProps = {
  logo: any
  products: ProductItem[]
  industries: IndustryItem[]
  onClose: () => void
  goToProduct: (tab: ProductItem['tab'], href?: string) => void
  onGoToIndustry: (href: string) => void
  onNavClick: (section: NavItem) => void
  getActiveClass: (section: NavItem) => string
  handleContactClick: () => void
  sectionsNavbar: NavItem[]
}

const MobileMenuContent = ({
  logo,
  products,
  industries,
  onClose,
  goToProduct,
  onGoToIndustry,
  onNavClick,
  getActiveClass,
  handleContactClick,
  sectionsNavbar,
}: MobileMenuContentProps) => {
  const [mobileProductsOpen, setMobileProductsOpen] = React.useState(false)
  const [mobileIndustriesOpen, setMobileIndustriesOpen] = React.useState(false)

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header: Logo + Close */}
      <div className="flex items-center justify-between px-6 py-5">
        <Link href="/" onClick={onClose}>
          <Image src={logo} alt="Logo" className="w-36" />
        </Link>
        <button onClick={onClose} className="p-2" aria-label="Cerrar menú">
          <AssetIcon.xMark width={24} height={24} className="text-black" />
        </button>
      </div>

      {/* Items */}
      <div className="flex flex-col">
        {/* Productos (acordeón) */}
        <div className="border-t border-gray-200">
          <button
            onClick={() => setMobileProductsOpen((v) => !v)}
            className="w-full text-left px-6 py-5 flex items-center justify-between"
          >
            <span className="text-base font-bold text-black">Productos</span>
          </button>

          {mobileProductsOpen && (
            <div className="px-6 pb-4">
              <div className="flex flex-col gap-1">
                {products.map((it) => (
                  <button
                    key={it.id}
                    onClick={() => {
                      onClose()
                      goToProduct(it.tab, it.href)
                    }}
                    className="text-left px-3 py-3 rounded-xl hover:bg-gray-50 transition cursor-pointer"
                  >
                    <span className="text-sm font-semibold text-black">{it.name}</span>
                    {it.description && <p className="text-xs text-gray-400 mt-0.5">{it.description}</p>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Industrias (acordeón) */}
        <div className="border-t border-gray-200">
          <button
            onClick={() => setMobileIndustriesOpen((v) => !v)}
            className="w-full text-left px-6 py-5 flex items-center justify-between"
          >
            <span className="text-base font-bold text-black">Industrias</span>
          </button>

          {mobileIndustriesOpen && (
            <div className="px-6 pb-4">
              <div className="flex flex-col gap-1">
                {industries.map((it) => (
                  <button
                    key={it.id}
                    onClick={() => {
                      onClose()
                      onGoToIndustry(it.href)
                    }}
                    className="text-left px-3 py-3 rounded-xl hover:bg-gray-50 transition cursor-pointer"
                  >
                    <span className="text-sm font-semibold text-black">{it.name}</span>
                    {it.description && <p className="text-xs text-gray-400 mt-0.5">{it.description}</p>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Resto normal */}
        {sectionsNavbar
          .filter((s) => s.type !== 'dropdown')
          .map((section) => (
            <button
              key={section.id}
              onClick={() => onNavClick(section)}
              className="w-full text-left px-6 py-5 border-t border-gray-200 cursor-pointer"
            >
              <span className={`text-base font-bold text-black ${getActiveClass(section)}`}>
                {section.name}
              </span>
            </button>
          ))}

        <div className="border-t border-gray-200" />
      </div>

      {/* CTA */}
      <div className="px-6 mt-12 pb-10">
        <Button
          size="md"
          text="Contáctanos"
          variant="primaryFilled"
          className="w-full max-w-[280px]"
          onClick={handleContactClick}
        />
      </div>
    </div>
  )
}

export const Header = ({ variant }: Props) => {
  const pathname = usePathname()
  const router = useRouter()
  const { showModal, hideModal } = useModalStore()
  const { ipCurrency } = useCurrencyStore()
  const searchParams = useSearchParams()

  const logo = variant === 'primary' ? AssetImage.logoBlack : AssetImage.logoBlack

  // ✅ Industrias
  const industries: IndustryItem[] = useMemo(
    () => [
      {
        id: 1,
        name: 'Telco',
        href: `${SENA_BASE_URL}/industrias/telco`,
        description: 'Cobranza B2B para contratos de conectividad y servicios gestionados',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M5 12.55C6.97 16.84 10.16 20.03 14.45 22L16.69 19.77C16.97 19.49 17.37 19.4 17.72 19.53C18.87 19.93 20.1 20.15 21.38 20.15C21.93 20.15 22.38 20.6 22.38 21.15V24C22.38 24.55 21.93 25 21.38 25C10.33 25 1.38 16.05 1.38 5C1.38 4.45 1.83 4 2.38 4H5.23C5.78 4 6.23 4.45 6.23 5C6.23 6.28 6.45 7.51 6.85 8.66C6.97 9.01 6.89 9.41 6.6 9.69L5 12.55Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),
      },
      {
        id: 2,
        name: 'Tech Beauty',
        href: `${SENA_BASE_URL}/industrias/tech-beauty`,
        description: 'Gestión de cuentas por cobrar para distribuidores y salones',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        ),
      },
      {
        id: 3,
        name: 'Maquinarias',
        href: `${SENA_BASE_URL}/industrias/maquinarias`,
        description: 'Recupera facturas de alto valor en minería y maquinaria pesada',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),
      },
      {
        id: 4,
        name: 'Servicios Básicos',
        href: `${SENA_BASE_URL}/industrias/servicios-basicos`,
        description: 'Cobranza para contratos regulados de utilities y servicios esenciales',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),
      },
      {
        id: 5,
        name: 'Autopistas',
        href: `${SENA_BASE_URL}/industrias/autopistas`,
        description: 'Conciliación de TAG, flotas y cobranza en concesiones viales',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M5 18H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.19M15 6h2.81A2 2 0 0 1 20 8v8a2 2 0 0 1-2 2h-2"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M7 18a2 2 0 1 0 4 0 2 2 0 0 0-4 0zM13 18a2 2 0 1 0 4 0 2 2 0 0 0-4 0z"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path d="M12 2v4M8 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        id: 6,
        name: 'Family Office',
        href: `${SENA_BASE_URL}/industrias/family-office`,
        description: 'Control financiero y cobranza patrimonial para holdings familiares',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v4M12 14v4M16 14v4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),
      },
      {
        id: 7,
        name: 'Intercompany',
        href: `${SENA_BASE_URL}/industrias/intercompany`,
        description: 'Protege tu MRR y recupera pagos fallidos en modelos de suscripción',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M17 1l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M3 11V9a4 4 0 0 1 4-4h14"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M7 23l-4-4 4-4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M21 13v2a4 4 0 0 1-4 4H3"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),
      },
      {
        id: 8,
        name: 'Inmobiliarias',
        href: `${SENA_BASE_URL}/industrias/inmobiliarias`,
        description: 'Gestión de cuotas, arriendos y promesas en proyectos inmobiliarios',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9 22V12h6v10"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),
      },
    ],
    []
  )

  const products: ProductItem[] = useMemo(
    () => [
      {
        id: 1,
        name: 'Plataforma de autogestión',
        description: 'Cobros automáticos, recordatorios y seguimiento.',
        tab: 'autogestion',
      },
      {
        id: 2,
        name: 'Recupera',
        description: 'Gestión de cobranza B2B. Pagas solo si recuperamos.',
        tab: 'recuperacion',
      },
      {
        id: 3,
        name: 'Opera',
        description: 'Servicio de cobranza all-in.',
        tab: 'external',
        href: 'https://agente.somossena.com/',
      },
    ],
    []
  )

  // ✅ Quitamos "Recupera" del header
  const sectionsNavbar: NavItem[] = useMemo(
    () => [
      { id: 101, name: 'Productos', type: 'dropdown', key: 'productos' },
      { id: 102, name: 'Industrias', type: 'dropdown', key: 'industrias' },
      { id: 2, name: 'Precios', href: '#precios', type: 'scroll' },
      {
        id: 3,
        name: 'Nosotros',
        href: `${SENA_BASE_URL}/nosotros`,
        type: 'external',
      },
      { id: 5, name: 'Blog', href: `${SENA_BASE_URL}/blog`, type: 'external' },
    ],
    []
  )

  const isActive = (section: NavItem) => {
    if (section.type === 'redirect' && section.href === '/') return pathname === '/'
    return false
  }

  const getActiveClass = (section: NavItem) => {
    if (!isActive(section)) return ''
    return 'inline-block border-b-2 border-brand-secondary !text-brand-primary pb-[2px]'
  }

  const handleNavClick = (section: NavItem) => {
    hideModal()

    if (isActive(section)) return

    if (section.type === 'external') {
      window.location.href = section.href
      return
    }

    if (section.type === 'scroll') {
      const sectionId = section.href.replace('#', '')
      const element = document.getElementById(sectionId)
      if (element) {
        const offset = 72
        const elementPosition = element.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.pageYOffset - offset
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' })
      }
      return
    }

    if (section.type === 'redirect') {
      router.push(section.href)
      return
    }
  }

  const handleContactClick = () => {
    hideModal()
    router.push('/?section=contacto')
  }

  const redirectLogin = () => {
    const url = ipCurrency === 'PEN' ? 'pe' : ''
    router.push(`https://dashboard.somossena.com/login?l=${url}&origin=main`)
  }

  // =========================
  // ✅ Dropdown states (desktop)
  // =========================
  const [openIndustries, setOpenIndustries] = useState(false)
  const [openProducts, setOpenProducts] = useState(false)

  const closeTimerIndustries = useRef<number | null>(null)
  const closeTimerProducts = useRef<number | null>(null)

  const openInd = () => {
    if (closeTimerIndustries.current) window.clearTimeout(closeTimerIndustries.current)
    setOpenIndustries(true)
  }
  const closeInd = (delay = 120) => {
    if (closeTimerIndustries.current) window.clearTimeout(closeTimerIndustries.current)
    closeTimerIndustries.current = window.setTimeout(() => setOpenIndustries(false), delay)
  }

  const openProd = () => {
    if (closeTimerProducts.current) window.clearTimeout(closeTimerProducts.current)
    setOpenProducts(true)
  }
  const closeProd = (delay = 120) => {
    if (closeTimerProducts.current) window.clearTimeout(closeTimerProducts.current)
    closeTimerProducts.current = window.setTimeout(() => setOpenProducts(false), delay)
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenIndustries(false)
        setOpenProducts(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    const section = searchParams.get('section')
    if (section === 'contacto') {
      const el = document.getElementById('contacto')
      if (el) {
        const offset = 72
        const top = el.getBoundingClientRect().top + window.scrollY - offset
        window.scrollTo({ top, behavior: 'smooth' })
      }
    }
  }, [searchParams])

  const goToIndustry = (href: string) => {
    setOpenIndustries(false)
    window.location.href = href
  }

  // ✅ Recuperación -> subdominio, Autogestión normal
  const goToProduct = (tab: ProductItem['tab'], href?: string) => {
    setOpenProducts(false)

    if (tab === 'external' && href) {
      window.location.href = href
      return
    }

    if (tab === 'recuperacion') {
      window.location.href = 'https://recupera.somossena.com/'
      return
    }

    window.location.href = `${SENA_BASE_URL}/?tab=${tab}#productos`
  }

  // =========================
  // ✅ Mobile menu (con componente que re-renderiza bien)
  // =========================
  const openMobileMenu = () => {
    showModal({
      content: (
        <MobileMenuContent
          logo={logo}
          products={products}
          industries={industries}
          onClose={hideModal}
          goToProduct={goToProduct}
          onGoToIndustry={goToIndustry}
          onNavClick={handleNavClick}
          getActiveClass={getActiveClass}
          handleContactClick={handleContactClick}
          sectionsNavbar={sectionsNavbar}
        />
      ),
      showHeader: false,
      width: '100%',
      height: '100vh',
      modalClassName: 'lg:hidden',
      contentClassName: '!rounded-none !max-h-full',
    })
  }

  return (
    <header className="sticky top-0 z-50 bg-[#f9f9f9]">
      <div className="mx-auto max-w-[1280px] flex items-center gap-2 justify-between p-4">
        <div>
          <Link href={SENA_BASE_URL}>
            <Image src={logo} alt="Logo" className="w-36" />
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center justify-between gap-12 relative">
          {sectionsNavbar.map((section) => {
            // ✅ Productos (dropdown)
            if (section.type === 'dropdown' && section.key === 'productos') {
              return (
                <div
                  key={section.id}
                  className="relative"
                  onMouseEnter={openProd}
                  onMouseLeave={() => closeProd(140)}
                >
                  <button
                    type="button"
                    onFocus={openProd}
                    className={`flex items-center gap-2 font-semibold cursor-pointer ${
                      variant === 'primary' ? 'text-brand-primary-dark' : 'text-blue-500'
                    }`}
                    aria-haspopup="menu"
                    aria-expanded={openProducts}
                  >
                    Productos
                  </button>

                  <div
                    className={`absolute left-1/2 -translate-x-1/2 top-[52px] w-[680px] ${
                      openProducts
                        ? 'opacity-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 -translate-y-1 pointer-events-none'
                    } transition-all duration-150`}
                    onMouseEnter={openProd}
                    onMouseLeave={() => closeProd(140)}
                  >
                    <div className="rounded-2xl bg-white shadow-[0_18px_60px_rgba(0,0,0,0.12)] border border-gray-100 overflow-hidden">
                      <div className="grid grid-cols-12">
                        <div className="col-span-4 bg-gray-50 p-7">
                          <h4 className="text-2xl font-extrabold text-black">Productos</h4>
                          <p className="text-sm text-gray-600 mt-3 leading-relaxed">
                            Conoce nuestras soluciones de cobranza y elige la que mejor se adapte a tu
                            operación.
                          </p>
                          <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-primary">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M5 12H19"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                              <path
                                d="M12 5L19 12L12 19"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            Ir a productos
                          </div>
                        </div>

                        <div className="col-span-8 p-6">
                          <div className="flex flex-col gap-1">
                            {products.map((it) => (
                              <button
                                key={it.id}
                                onClick={() => goToProduct(it.tab, it.href)}
                                className="group text-left rounded-xl p-3 hover:bg-gray-50 transition cursor-pointer"
                                role="menuitem"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 shrink-0 rounded-lg bg-brand-primary/5 group-hover:bg-brand-primary/10 border border-brand-primary/10 flex items-center justify-center text-brand-primary transition-colors">
                                    {it.tab === 'autogestion' ? (
                                      <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <path
                                          d="M12 2L14.2 7.8L20 10L14.2 12.2L12 18L9.8 12.2L4 10L9.8 7.8L12 2Z"
                                          stroke="currentColor"
                                          strokeWidth="1.6"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    ) : (
                                      <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <path
                                          d="M17 21V19C17 16.79 15.21 15 13 15H5C2.79 15 1 16.79 1 19V21"
                                          stroke="currentColor"
                                          strokeWidth="1.6"
                                          strokeLinecap="round"
                                        />
                                        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.6" />
                                      </svg>
                                    )}
                                  </div>

                                  <div>
                                    <p className="text-sm font-bold text-black">{it.name}</p>
                                    {it.description && (
                                      <p className="text-xs text-gray-500 mt-1">{it.description}</p>
                                    )}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }

            // ✅ Industrias (dropdown)
            if (section.type === 'dropdown' && section.key === 'industrias') {
              return (
                <div
                  key={section.id}
                  className="relative"
                  onMouseEnter={openInd}
                  onMouseLeave={() => closeInd(140)}
                >
                  <button
                    type="button"
                    onFocus={openInd}
                    className={`flex items-center gap-2 font-semibold cursor-pointer ${
                      variant === 'primary' ? 'text-brand-primary-dark' : 'text-blue-500'
                    }`}
                    aria-haspopup="menu"
                    aria-expanded={openIndustries}
                  >
                    Industrias
                  </button>

                  <div
                    className={`absolute left-1/2 -translate-x-1/2 top-[52px] w-[760px] ${
                      openIndustries
                        ? 'opacity-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 -translate-y-1 pointer-events-none'
                    } transition-all duration-150`}
                    onMouseEnter={openInd}
                    onMouseLeave={() => closeInd(140)}
                  >
                    <div className="rounded-2xl bg-white shadow-[0_18px_60px_rgba(0,0,0,0.12)] border border-gray-100 overflow-hidden">
                      <div className="grid grid-cols-12">
                        <div className="col-span-4 bg-gray-50 p-7">
                          <h4 className="text-2xl font-extrabold text-black">Industrias</h4>
                          <p className="text-sm text-gray-600 mt-3 leading-relaxed">
                            Soluciones de cobranza B2B adaptadas a los desafíos de tu sector.
                          </p>
                          <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-primary">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M5 12H19"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                              <path
                                d="M12 5L19 12L12 19"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            Explora tu industria
                          </div>
                        </div>

                        <div className="col-span-8 p-6">
                          <div className="grid grid-cols-2 gap-2">
                            {industries.map((it) => (
                              <button
                                key={it.id}
                                onClick={() => goToIndustry(it.href)}
                                className="group text-left rounded-xl p-3 hover:bg-gray-50 transition cursor-pointer"
                                role="menuitem"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="mt-0.5 h-8 w-8 shrink-0 rounded-lg bg-brand-primary/5 group-hover:bg-brand-primary/10 border border-brand-primary/10 flex items-center justify-center text-brand-primary transition-colors">
                                    {it.icon}
                                  </div>

                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-black">{it.name}</p>
                                    {it.description && (
                                      <p className="text-[11px] text-gray-400 mt-0.5 leading-snug line-clamp-2">
                                        {it.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }

            // ✅ Resto normal
            if (section.type === 'scroll') {
              return (
                <button
                  key={section.id}
                  onClick={() => handleNavClick(section)}
                  className={`${
                    variant === 'primary' ? 'text-brand-primary-dark' : 'text-blue-500'
                  } font-semibold cursor-pointer`}
                >
                  {section.name}
                </button>
              )
            }

            return (
              <button
                key={section.id}
                onClick={() => handleNavClick(section)}
                className={`${
                  variant === 'primary' ? 'text-brand-primary-dark' : 'text-blue-500'
                } font-semibold cursor-pointer ${getActiveClass(section)}`}
              >
                {section.name}
              </button>
            )
          })}
        </div>

        {/* Desktop CTA */}
        <div className="hidden lg:flex items-center gap-2">
          <Button
            size="md"
            text="Iniciar sesión"
            variant="ghost"
            onClick={redirectLogin}
            className="text-md"
          />
          <Button
            size="md"
            text="Contáctanos"
            variant={variant === 'primary' ? 'primaryFilled' : 'secondaryFilled'}
            className="text-md"
            onClick={handleContactClick}
          />
        </div>

        {/* Mobile */}
        <div className="lg:hidden flex items-center gap-2">
          <Button
            size="sm"
            text="Contáctanos"
            variant="secondaryFilled"
            className="text-xs px-3 py-1.5"
            onClick={handleContactClick}
          />
          <button onClick={openMobileMenu} className="p-2 z-50" aria-label="Abrir menú">
            <AssetIcon.menu width={28} height={28} />
          </button>
        </div>
      </div>
    </header>
  )
}
