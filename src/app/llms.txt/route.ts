import { NextResponse } from 'next/server'

export async function GET() {
  const content = `# Sena Recupera — Cobranza B2B de cartera vencida en Chile y Perú

> Recuperamos las facturas que tu empresa ya no pudo cobrar, cuidando la relación donde todavía se puede.
> Pagas 15% solo sobre lo que recuperamos, sin costo fijo ni ticket mínimo.

## Qué hace Sena Recupera

Sena Recupera gestiona la cobranza de facturas B2B que ya vencieron:
- Evaluación gratis de la cartera: antigüedad, montos y gestiones previas. Respuesta en 24 horas.
- Propuesta con lo que se puede esperar de la cartera antes de empezar.
- Gestión por correo, SMS y WhatsApp, con una ejecutiva del equipo de Sena para las llamadas y los
  casos complejos. La gestión parte por la conversación y cuida la relación con el cliente.
- Cuando no hay respuesta, publicación en DICOM (Chile, a través de Equifax) como respaldo, no como
  primer paso.

## Precio

- 15% sobre el monto efectivamente recuperado.
- Sin ticket mínimo: cualquier tamaño de cartera.
- Sin costo fijo ni mensualidad.
- Si no recuperamos, no pagas.

## Qué cartera toma

- Facturas vencidas hace más de 60 días.
- Foco en cobranza B2B; también evaluamos carteras B2C y mixtas.
- Operamos en Chile y Perú.
- Los plazos de recuperación dependen de cada cartera y se presentan en la propuesta.

Para la cartera que todavía no vence está Ópera, el equipo de cobranza externo de Sena:
https://agente.somossena.com

## Páginas principales

- [Inicio](https://recupera.somossena.com): propuesta, cómo funciona y precio
- [Cómo funciona](https://recupera.somossena.com/#como): los cuatro pasos
- [Precio](https://recupera.somossena.com/#precio): 15% sobre lo recuperado
- [Preguntas frecuentes](https://recupera.somossena.com/#faq)
- [Evaluación gratis](https://recupera.somossena.com/#caso): formulario de contacto

## Sena

- Sena: https://www.somossena.com
- Ópera: https://agente.somossena.com
- Contacto: hola@somossena.com
`.trim()

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
