// Los smoke tests post-deploy usan emails de prueba del dominio propio, como
// smoke+1730000000@somossena.com (el usuario empieza con "smoke+" o lleva "+smoke").
// Esos leads no se reportan a Meta CAPI, para no contaminar las conversiones con contactos de prueba.
// Solo vale para somossena.com: un email de otro dominio con ese formato se trata como un lead real.
export function isSmokeTest(email: string): boolean {
  return /^(?:smoke\+|[^@]*\+smoke)[^@]*@somossena\.com$/i.test(email.trim())
}
