import clsx from 'clsx'
import type { ReactNode } from 'react'

// Piezas repetidas de la landing: contenedor, etiqueta de sección, título con punto en Caslon y flechas.

export const Container = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div className={clsx('max-w-[1200px] mx-auto px-4 sm:px-6', className)}>{children}</div>
)

// El color va por `tone` y no por className: dos utilidades de color en el mismo elemento no se pisan
// de forma predecible.
const EYEBROW_TONE = {
  muted: 'text-text-secondary',
  onDark: 'text-text-on-dark',
  white: 'text-white',
}

export const Eyebrow = ({
  tone = 'muted',
  children,
}: {
  tone?: keyof typeof EYEBROW_TONE
  children: ReactNode
}) => (
  <span className={clsx('text-[13px] font-bold tracking-[.14em] uppercase', EYEBROW_TONE[tone])}>
    {children}
  </span>
)

// Caslon recta solo como acento: la puntuación final del título y alguna palabra destacada.
export const Accent = ({ className, children }: { className?: string; children: ReactNode }) => (
  <span className={clsx('font-caslon font-normal', className)}>{children}</span>
)

export const Dot = ({
  className = 'text-brand-secondary',
  mark = '.',
}: {
  className?: string
  mark?: string
}) => <Accent className={className}>{mark}</Accent>

// Tamaño por `size` por la misma razón que el color del Eyebrow.
const TITLE_SIZE = {
  md: 'text-[34px] sm:text-[42px] lg:text-[48px] leading-[1.06]',
  lg: 'text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.06]',
  xl: 'text-[38px] sm:text-[46px] lg:text-[54px] leading-[1.04]',
  xxl: 'text-[40px] sm:text-[50px] lg:text-[58px] leading-[1.04]',
}

export const SectionTitle = ({
  id,
  size = 'lg',
  children,
}: {
  id?: string
  size?: keyof typeof TITLE_SIZE
  children: ReactNode
}) => (
  <h2 id={id} className={clsx('m-0 font-canaro font-bold tracking-[-.015em] text-balance', TITLE_SIZE[size])}>
    {children}
  </h2>
)

export const ArrowUpRight = ({ size = 14 }: { size?: number }) => (
  <svg
    aria-hidden="true"
    width={size}
    height={size}
    viewBox="0 0 14 14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path d="M3 11L11 3M5 3h6v6" />
  </svg>
)

export const ArrowDown = () => (
  <svg
    aria-hidden="true"
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path d="M6 1v10M2 7l4 4 4-4" />
  </svg>
)

export const Check = ({ size = 12 }: { size?: number }) => (
  <svg
    aria-hidden="true"
    width={size}
    height={size}
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M2 6.5l2.5 2.5L10 3.5" />
  </svg>
)

// CTA principal en píldora: mismo lenguaje que Button.tsx, pero como enlace a una sección.
export const PillLink = ({
  href,
  variant = 'primary',
  className,
  children,
}: {
  href: string
  variant?: 'primary' | 'dark' | 'inverted'
  className?: string
  children: ReactNode
}) => (
  <a
    href={href}
    className={clsx(
      'inline-flex items-center justify-center gap-2.5 rounded-full font-bold no-underline min-h-12 px-6 py-3 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      variant === 'primary' &&
        'bg-brand-primary text-white hover:bg-brand-primary/90 focus-visible:ring-brand-primary',
      variant === 'dark' &&
        'bg-brand-primary-dark text-white hover:bg-brand-primary-dark/90 focus-visible:ring-brand-primary-dark',
      variant === 'inverted' && 'bg-white text-brand-primary-dark hover:bg-white/90 focus-visible:ring-white',
      className
    )}
  >
    {children}
  </a>
)

export const UnderlineLink = ({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: ReactNode
}) => (
  <a
    href={href}
    className={clsx(
      'inline-flex items-center gap-2 self-start border-b-2 border-brand-primary-dark py-1.5 font-bold text-brand-primary-dark no-underline hover:text-brand-primary hover:border-brand-primary',
      className
    )}
  >
    {children}
  </a>
)
