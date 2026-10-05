// Envío del formulario de lead a sus dos destinos: /api/lead (HubSpot) y el backend de SENA.
// El lead se considera guardado si cualquiera de los dos lo recibió: que HubSpot falle (o cambie un
// campo de clasificación) no puede significar perder al lead ni mostrarle un error al visitante.

export type SubmitLeadResult = { ok: boolean; crm: boolean; backend: boolean }

type SubmitLeadDeps = {
  // Cada destino devuelve true si guardó el lead; si lanza una excepción cuenta como fallo.
  saveCrm: () => Promise<boolean>
  saveBackend: () => Promise<boolean>
}

const settle = (save: () => Promise<boolean>): Promise<boolean> =>
  Promise.resolve()
    .then(save)
    .then(Boolean, () => false)

export async function submitLead({ saveCrm, saveBackend }: SubmitLeadDeps): Promise<SubmitLeadResult> {
  const [crm, backend] = await Promise.all([settle(saveCrm), settle(saveBackend)])
  return { ok: crm || backend, crm, backend }
}
