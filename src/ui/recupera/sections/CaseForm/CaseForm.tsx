'use client'

import {
  getAttributionPayload,
  landingPageUrl,
  newEventId,
  rememberLeadEventId,
} from '@/lib/lead/clientAttribution'
import { SUBMIT_TIMEOUT_MS, submitLead } from '@/lib/lead/submit'
import type { LeadCaso } from '@/lib/lead/validate'
import { useCountries } from '@/lib/services/countryService'
import { usePostContactForm } from '@/lib/services/contactService'
import { useCurrencyStore } from '@/lib/store/useCurrencyStore'
import type { ContactFormRequest } from '@/lib/types/contact'
import SimpleCountrySelect, { OptionSelect } from '@/ui/shared/SimpleCountrySelect'
import { TurnstileWidget, useTurnstile } from '@/ui/shared/Turnstile'
import clsx from 'clsx'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Accent, ArrowUpRight, Check } from '../shared'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    gtag?: (...args: unknown[]) => void
  }
}

const COTIZAR: { id: LeadCaso['cotizar']; label: string }[] = [
  { id: 'habitual', label: 'Cartera habitual' },
  { id: 'recupera', label: 'Empezar por Recupera' },
]
const TIPOS: LeadCaso['tipo_cartera'][] = ['B2B', 'B2C', 'Mixta']
const NECESIDADES: { id: LeadCaso['necesidad']; label: string }[] = [
  { id: 'equipo', label: 'Potenciar mi equipo' },
  { id: 'delegar', label: 'Delegar la gestión' },
  { id: 'recaudacion', label: 'Recaudación y conciliación' },
  { id: 'dificil', label: 'Recuperar deuda difícil' },
]
const CANALES: LeadCaso['canales'] = ['Correo', 'SMS', 'WhatsApp', 'Llamadas']
const ANTIGUEDADES: { id: NonNullable<LeadCaso['antiguedad']>; label: string }[] = [
  { id: '0-30', label: 'Menos de 30 días' },
  { id: '31-90', label: '31 a 90 días' },
  { id: '91-180', label: '91 a 180 días' },
  { id: '180+', label: 'Más de 180 días' },
]

// Recupera opera en Chile y Perú: el teléfono acepta esos dos prefijos.
const PAISES = [
  { prefijo: '+56', codigo: 'CL' },
  { prefijo: '+51', codigo: 'PE' },
]

const ERROR_GENERICO = 'No pudimos registrar tu caso. Intenta de nuevo o escríbenos a hola@somossena.com.'
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const inputClass =
  'w-full font-[inherit] text-brand-primary-dark border border-border-input rounded-[10px] px-3.5 py-3 min-h-[46px] bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary'

const Chip = ({
  id,
  on,
  onClick,
  children,
}: {
  id?: string
  on: boolean
  onClick: () => void
  children: ReactNode
}) => (
  <button
    id={id}
    type="button"
    aria-pressed={on}
    onClick={onClick}
    className={clsx(
      'text-[15px] text-left text-brand-primary-dark rounded-[10px] px-3.5 py-3 min-h-[46px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary',
      on
        ? 'border-[1.5px] border-brand-primary bg-surface-blue-soft font-bold'
        : 'border border-border-input bg-white'
    )}
  >
    {children}
  </button>
)

const Grupo = ({ legend, children }: { legend: ReactNode; children: ReactNode }) => (
  <fieldset className="border-0 m-0 p-0 flex flex-col gap-2.5 min-w-0">
    <legend className="font-bold mb-2.5 p-0">{legend}</legend>
    {children}
  </fieldset>
)

const Opcional = () => <span className="font-normal text-text-secondary">(opcional)</span>

// Conversión del lead: mismos eventos que antes disparaba la página /thankyou (GTM, Google Ads y Meta).
function trackLeadConversion(eventId: string) {
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ event: 'conversion_event_signup_2', origin: 'recupera' })
  if (window.gtag) {
    window.gtag('event', 'conversion', {
      send_to: 'AW-17962976949/sCCeCNfunKccELWNtfVC',
      transaction_id: eventId,
    })
  }
  if (window.fbq) window.fbq('track', 'Lead', { content_name: 'recupera' }, { eventID: eventId })
}

type Contacto = { nombre: string; empresa: string; email: string; telefono: string; comentarios: string }
const CONTACTO_VACIO: Contacto = { nombre: '', empresa: '', email: '', telefono: '', comentarios: '' }

export const CaseForm = () => {
  const [paso, setPaso] = useState<1 | 2>(1)
  const [enviado, setEnviado] = useState(false)
  const [cotizar, setCotizar] = useState<LeadCaso['cotizar']>('recupera')
  const [tipo, setTipo] = useState<LeadCaso['tipo_cartera']>('B2B')
  const [necesidad, setNecesidad] = useState<LeadCaso['necesidad']>('dificil')
  const [canales, setCanales] = useState<LeadCaso['canales']>(['Correo'])
  const [volClientes, setVolClientes] = useState('')
  const [volFacturas, setVolFacturas] = useState('')
  const [antiguedad, setAntiguedad] = useState('')
  const [contacto, setContacto] = useState<Contacto>(CONTACTO_VACIO)
  const [errores, setErrores] = useState<Partial<Record<keyof Contacto, string>>>({})
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState('')

  const turnstile = useTurnstile()
  const { postContactFormAsync } = usePostContactForm()
  const { data: countries = [] } = useCountries()
  const { ipCurrency } = useCurrencyStore()
  const [prefijo, setPrefijo] = useState('+56')

  // Las banderas vienen del servicio de países; sin él, el selector muestra solo el prefijo.
  const countryOptions = useMemo<OptionSelect[]>(
    () =>
      PAISES.map(({ prefijo: p }) => ({
        id: p,
        label: p,
        icon: countries.find((c) => c.country === p)?.icon ?? null,
        subValue: p,
      })),
    [countries]
  )

  useEffect(() => {
    if (ipCurrency === 'PEN') setPrefijo('+51')
  }, [ipCurrency])

  // Al cambiar de paso, el foco va al primer campo del paso nuevo (o al agradecimiento): el botón que lo
  // tenía desaparece.
  const montado = useRef(false)
  useEffect(() => {
    if (!montado.current) {
      montado.current = true
      return
    }
    document.getElementById(enviado ? 'caso-gracias' : paso === 2 ? 'caso-nombre' : 'caso-cotizar')?.focus()
  }, [paso, enviado])

  const set = (campo: keyof Contacto) => (value: string) => {
    setContacto((c) => ({ ...c, [campo]: value }))
    setErrores((e) => ({ ...e, [campo]: undefined }))
  }

  const toggleCanal = (canal: LeadCaso['canales'][number]) =>
    setCanales((cs) => (cs.includes(canal) ? cs.filter((c) => c !== canal) : [...cs, canal]))

  const validar = (): boolean => {
    const e: Partial<Record<keyof Contacto, string>> = {}
    if (!contacto.nombre.trim()) e.nombre = 'Escribe tu nombre.'
    if (!contacto.empresa.trim()) e.empresa = 'Escribe el nombre de tu empresa.'
    if (!EMAIL.test(contacto.email.trim())) e.email = 'Escribe un email válido.'
    if (contacto.telefono.length < 6) e.telefono = 'Escribe tu número de teléfono.'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  const enviar = async () => {
    if (!validar()) return
    setEnviando(true)
    setErrorEnvio('')

    // first-touch: lo guardado en la sesión (gclid, gbraid, wbraid, fbclid, utm_*) más lo de la URL actual
    const atribucion = getAttributionPayload()
    // mismo id para el pixel de Meta y Meta CAPI, para que Meta deduplique el Lead
    const eventId = newEventId()
    rememberLeadEventId(eventId)

    const [nombre, ...resto] = contacto.nombre.trim().split(/\s+/)
    const apellido = resto.join(' ')
    const empresa = contacto.empresa.trim()
    const email = contacto.email.trim()
    // E.164: prefijo del país y solo dígitos.
    const telefono = `${prefijo}${contacto.telefono}`
    const comentarios = contacto.comentarios.trim()
    const caso: LeadCaso = {
      cotizar,
      tipo_cartera: tipo,
      necesidad,
      canales,
      volumen_clientes: volClientes ? Number(volClientes) : undefined,
      volumen_facturas: volFacturas ? Number(volFacturas) : undefined,
      antiguedad: (antiguedad || undefined) as LeadCaso['antiguedad'],
      comentarios: comentarios || undefined,
    }

    const contactPayload: ContactFormRequest = {
      nombre,
      apellido,
      correo: email,
      telefono,
      formOrigin: 'Formulario de Registro',
      countryName: PAISES.find((p) => p.prefijo === prefijo)?.codigo ?? '',
      productType: 'recupera',
      nombreEmpresa: empresa,
      mensaje: comentarios,
      howFound: '',
      utmSource: atribucion.utmSource,
      utmMedium: atribucion.utmMedium,
      utmCampaign: atribucion.utmCampaign,
      utmContent: atribucion.utmContent,
    }

    // Token de Turnstile (no bloquea: sin token el servidor marca el lead como sin verificar)
    const turnstileToken = await turnstile.getToken()

    // El lead se guarda en HubSpot y en el backend: basta con que uno lo reciba para no perderlo.
    const result = await submitLead({
      saveCrm: async () => {
        const res = await fetch('/api/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre,
            apellido: apellido || undefined,
            empresa,
            email,
            telefono,
            caso,
            ...atribucion,
            landingPage: landingPageUrl(),
            'cf-turnstile-response': turnstileToken,
            eventId,
          }),
          signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
        })
        const json = await res.json().catch(() => ({ ok: false }))
        return res.ok && json.ok === true
      },
      saveBackend: async () => {
        await postContactFormAsync(contactPayload)
        return true
      },
    })

    setEnviando(false)
    if (!result.ok) {
      // El token es de un solo uso: el siguiente intento necesita uno nuevo.
      turnstile.reset()
      setErrorEnvio(ERROR_GENERICO)
      return
    }

    trackLeadConversion(eventId)
    setEnviado(true)
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (paso === 1) setPaso(2)
    else void enviar()
  }

  const reiniciar = () => {
    turnstile.reset()
    setContacto(CONTACTO_VACIO)
    setErrores({})
    setErrorEnvio('')
    setPaso(1)
    setEnviado(false)
  }

  const campo = (
    id: keyof Contacto,
    label: string,
    props: { type?: string; autoComplete?: string; placeholder: string }
  ) => (
    <div className="flex-[1_1_200px] min-w-0 flex flex-col gap-1.5">
      <label htmlFor={`caso-${id}`} className="font-bold">
        {label}
      </label>
      <input
        id={`caso-${id}`}
        type={props.type ?? 'text'}
        required
        autoComplete={props.autoComplete}
        placeholder={props.placeholder}
        value={contacto[id]}
        onChange={(e) => set(id)(e.target.value)}
        aria-invalid={!!errores[id]}
        aria-describedby={errores[id] ? `caso-${id}-error` : undefined}
        className={clsx(inputClass, errores[id] && 'border-error')}
      />
      {errores[id] && (
        <p id={`caso-${id}-error`} className="m-0 text-sm text-error">
          {errores[id]}
        </p>
      )}
    </div>
  )

  return (
    <form
      aria-label="Evalúa tu cartera"
      onSubmit={onSubmit}
      noValidate
      className="flex-[1_1_480px] min-w-0 bg-white text-brand-primary-dark rounded-[18px] p-5 sm:p-[30px] flex flex-col gap-[22px]"
    >
      <div className="flex justify-between text-xs tracking-[.12em] uppercase text-text-secondary">
        <span>Cuéntanos tu caso</span>
        <span aria-live="polite">{enviado ? 'Enviado' : `Paso ${paso} de 2`}</span>
      </div>

      {!enviado && paso === 1 && (
        <div className="flex flex-col gap-[22px]">
          <Grupo legend="¿Qué quieres cotizar?">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5">
              {COTIZAR.map((c, i) => (
                <Chip
                  key={c.id}
                  id={i === 0 ? 'caso-cotizar' : undefined}
                  on={cotizar === c.id}
                  onClick={() => setCotizar(c.id)}
                >
                  {c.label}
                </Chip>
              ))}
            </div>
          </Grupo>
          <div className="flex flex-col gap-2">
            <label htmlFor="caso-antiguedad" className="font-bold">
              Antigüedad principal de la deuda <Opcional />
            </label>
            <select
              id="caso-antiguedad"
              value={antiguedad}
              onChange={(e) => setAntiguedad(e.target.value)}
              className={inputClass}
            >
              <option value="">Seleccionar</option>
              {ANTIGUEDADES.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <Grupo legend="Tipo de cartera">
            <div className="flex flex-wrap gap-2.5">
              {TIPOS.map((t) => (
                <Chip key={t} on={tipo === t} onClick={() => setTipo(t)}>
                  {t}
                </Chip>
              ))}
            </div>
          </Grupo>
          <Grupo
            legend={
              <>
                Volumen <Opcional />
              </>
            }
          >
            <span className="-mt-1.5 text-sm text-text-secondary">Completa uno o los dos.</span>
            <div className="flex flex-wrap gap-3">
              <div className="flex-[1_1_180px] min-w-0 flex flex-col gap-1.5">
                <label htmlFor="caso-vol-clientes" className="text-[15px]">
                  Clientes
                </label>
                <input
                  id="caso-vol-clientes"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="Ej. 12"
                  value={volClientes}
                  onChange={(e) => setVolClientes(e.target.value.replace(/\D/g, ''))}
                  className={inputClass}
                />
              </div>
              <div className="flex-[1_1_180px] min-w-0 flex flex-col gap-1.5">
                <label htmlFor="caso-vol-facturas" className="text-[15px]">
                  Facturas
                </label>
                <input
                  id="caso-vol-facturas"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="Ej. 40"
                  value={volFacturas}
                  onChange={(e) => setVolFacturas(e.target.value.replace(/\D/g, ''))}
                  className={inputClass}
                />
              </div>
            </div>
          </Grupo>
          <Grupo legend="Principal necesidad">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2.5">
              {NECESIDADES.map((n) => (
                <Chip key={n.id} on={necesidad === n.id} onClick={() => setNecesidad(n.id)}>
                  {n.label}
                </Chip>
              ))}
            </div>
          </Grupo>
          <Grupo legend="Canales necesarios">
            <div className="flex flex-wrap gap-2.5">
              {CANALES.map((k) => (
                <Chip key={k} on={canales.includes(k)} onClick={() => toggleCanal(k)}>
                  {canales.includes(k) && '✓ '}
                  {k}
                </Chip>
              ))}
            </div>
          </Grupo>
          <button
            type="submit"
            className="bg-brand-primary text-white border-0 rounded-full px-[22px] py-[15px] font-bold text-[17px] flex justify-between items-center min-h-[50px] cursor-pointer hover:bg-brand-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-primary"
          >
            Continuar
            <ArrowUpRight />
          </button>
        </div>
      )}

      {!enviado && paso === 2 && (
        <div className="flex flex-col gap-[18px]">
          <p className="m-0 text-[17px] text-text-body">¿A quién le enviamos la evaluación?</p>
          <div className="flex flex-wrap gap-3.5">
            {campo('nombre', 'Nombre', { autoComplete: 'name', placeholder: 'Nombre y apellido' })}
            {campo('empresa', 'Empresa', {
              autoComplete: 'organization',
              placeholder: 'Nombre de tu empresa',
            })}
          </div>
          <div className="flex flex-wrap gap-3.5">
            {campo('email', 'Email de trabajo', {
              type: 'email',
              autoComplete: 'email',
              placeholder: 'nombre@empresa.com',
            })}
            <div className="flex-[1_1_200px] min-w-0 flex flex-col gap-1.5">
              <label htmlFor="caso-telefono" className="font-bold">
                Teléfono
              </label>
              <div
                className={clsx(
                  'flex items-center border rounded-[10px] min-h-[46px] bg-white focus-within:ring-2 focus-within:ring-brand-primary',
                  errores.telefono ? 'border-error' : 'border-border-input'
                )}
              >
                <SimpleCountrySelect
                  value={prefijo}
                  onChange={setPrefijo}
                  options={countryOptions}
                  placeholder="+56"
                />
                <input
                  id="caso-telefono"
                  type="tel"
                  inputMode="numeric"
                  required
                  autoComplete="tel-national"
                  placeholder={prefijo === '+51' ? '912 345 678' : '9 1234 5678'}
                  value={contacto.telefono}
                  onChange={(e) => set('telefono')(e.target.value.replace(/\D/g, ''))}
                  aria-invalid={!!errores.telefono}
                  aria-describedby={errores.telefono ? 'caso-telefono-error' : undefined}
                  className="flex-1 min-w-0 font-[inherit] text-brand-primary-dark border-0 bg-transparent px-3 py-3 focus:outline-none"
                />
              </div>
              {errores.telefono && (
                <p id="caso-telefono-error" className="m-0 text-sm text-error">
                  {errores.telefono}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="caso-comentarios" className="font-bold">
              Comentarios <Opcional />
            </label>
            <textarea
              id="caso-comentarios"
              rows={4}
              maxLength={1000}
              placeholder="Cuéntanos algo más de las facturas que necesitas recuperar."
              value={contacto.comentarios}
              onChange={(e) => set('comentarios')(e.target.value)}
              className={clsx(inputClass, 'resize-y')}
            />
          </div>
          <p className="m-0 text-[13px] text-text-secondary">
            Al enviar, aceptas que Sena use estos datos para contactarte. Lee los{' '}
            <Link href="/term" className="text-brand-primary underline">
              Términos y condiciones
            </Link>{' '}
            y la{' '}
            <Link href="/privacy" className="text-brand-primary underline">
              Política de privacidad
            </Link>
            .
          </p>
          {errorEnvio && (
            <p role="alert" className="m-0 text-sm text-error">
              {errorEnvio}
            </p>
          )}
          <div className="flex flex-wrap gap-3 items-center">
            <button
              type="button"
              onClick={() => setPaso(1)}
              className="bg-transparent border-[1.5px] border-brand-primary-dark text-brand-primary-dark rounded-full px-[22px] py-[13px] font-bold min-h-[50px] cursor-pointer hover:bg-brand-primary-dark/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-primary-dark"
            >
              Volver
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="flex-[1_1_200px] bg-brand-primary text-white border-0 rounded-full px-[22px] py-[15px] font-bold text-[17px] flex justify-between items-center min-h-[50px] cursor-pointer hover:bg-brand-primary/90 disabled:opacity-60 disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-primary"
            >
              {enviando ? 'Enviando…' : 'Enviar'}
              <ArrowUpRight />
            </button>
          </div>
        </div>
      )}

      {enviado && (
        <div role="status" className="flex flex-col gap-4 pt-3 pb-1">
          <span className="w-[52px] h-[52px] rounded-full bg-success-soft text-success flex items-center justify-center">
            <Check size={22} />
          </span>
          <h3
            id="caso-gracias"
            tabIndex={-1}
            className="m-0 font-canaro font-bold text-[30px] sm:text-[34px] leading-[1.1] focus:outline-none"
          >
            Gracias. Recibimos tu caso<Accent className="text-brand-secondary">.</Accent>
          </h3>
          <p className="m-0 text-[17px] text-text-body">
            Revisamos tus facturas y te escribimos con la evaluación. Te respondemos en 24 horas.
          </p>
          <button
            type="button"
            onClick={reiniciar}
            className="self-start bg-transparent border-0 border-b-2 border-brand-primary-dark text-brand-primary-dark px-0 py-1.5 font-bold min-h-11 cursor-pointer"
          >
            Enviar otro caso
          </button>
        </div>
      )}

      {/* Montado en los tres estados: el token de Turnstile se pide mientras el visitante completa el paso 1. */}
      <TurnstileWidget turnstile={turnstile} />
    </form>
  )
}
