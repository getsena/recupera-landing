// Envío del formulario de lead a sus dos destinos: /api/lead (HubSpot) y el backend de SENA.
// El lead se considera guardado si cualquiera de los dos lo recibió: que HubSpot falle (o cambie un
// campo de clasificación) no puede significar perder al lead ni mostrarle un error al visitante.

export type SubmitLeadResult = { ok: boolean; crm: boolean; backend: boolean }

type SubmitLeadDeps = {
  // Cada destino devuelve true si guardó el lead; si lanza una excepción cuenta como fallo.
  saveCrm: () => Promise<boolean>
  saveBackend: () => Promise<boolean>
  // Tope por destino: pasado este tiempo el destino cuenta como fallo (por defecto 15 s)
  timeoutMs?: number
}

export const SUBMIT_TIMEOUT_MS = 15_000

const settle = (save: () => Promise<boolean>, timeoutMs: number): Promise<boolean> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), timeoutMs)
  })
  const attempt = Promise.resolve()
    .then(save)
    .then(Boolean, () => false)
  return Promise.race([attempt, timeout]).finally(() => clearTimeout(timer))
}

export async function submitLead({
  saveCrm,
  saveBackend,
  timeoutMs = SUBMIT_TIMEOUT_MS,
}: SubmitLeadDeps): Promise<SubmitLeadResult> {
  const [crm, backend] = await Promise.all([settle(saveCrm, timeoutMs), settle(saveBackend, timeoutMs)])
  return { ok: crm || backend, crm, backend }
}
