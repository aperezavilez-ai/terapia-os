export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function authErrorMessage(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Email o contraseña incorrectos. Verifica que estén bien escritos.'
  }
  if (lower.includes('email not confirmed')) {
    return 'Tu cuenta aún no está confirmada. Revisa tu correo.'
  }
  return message
}
